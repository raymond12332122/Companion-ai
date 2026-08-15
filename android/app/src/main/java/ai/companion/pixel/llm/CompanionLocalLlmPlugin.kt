package ai.companion.pixel.llm

import android.app.Activity
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File

/**
 * Bridges the companion's provider abstraction to an on-device model.
 *
 * Method shapes mirror `server/proxy.js`'s `/api/chat` contract on purpose:
 * the same `{system, messages}` in, `{response, emotion}` out. Nothing
 * upstream of this plugin — character, personality, memory, mood,
 * relationship, sprite or event systems — needs to know that inference
 * happened on the phone instead of on NVIDIA's servers.
 *
 * The engine behind it is [MediaPipeLlmEngine], which runs a real model when
 * one is present on the device and reports itself unavailable when none is.
 * See this package's README for where to put a model file.
 */
@CapacitorPlugin(name = "CompanionLocalLlm")
class CompanionLocalLlmPlugin : Plugin() {

    private val engine: LlmEngine = MediaPipeLlmEngine()
    private val importer = ModelImporter()

    override fun handleOnDestroy() {
        importer.cancel()
        engine.unload()
        super.handleOnDestroy()
    }

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val status = engine.availability(context)
        val result = JSObject()
        result.put("available", status.available)
        result.put("loaded", status.loaded)
        result.put("reason", status.reason)
        result.put("modelId", status.modelId)
        result.put("modelPath", status.modelPath)
        result.put("sizeBytes", status.sizeBytes)
        result.put("backend", status.backend)
        result.put("modelDir", ModelCatalog.preferredDropDir(context))
        // Lets the UI offer "Import a model" as the fix for having none,
        // rather than printing a directory path nobody can navigate to.
        result.put("canImport", true)
        result.put("importedFrom", ModelStore.importedSourceName(context))
        status.modelPath?.let { result.put("imported", ModelStore.isImported(context, it)) }
        call.resolve(result)
    }

    /** Every model file on the device, so the UI can name one instead of guessing. */
    @PluginMethod
    fun listModels(call: PluginCall) {
        val result = JSObject()
        result.put("models", modelsArray())
        result.put("modelDir", ModelCatalog.preferredDropDir(context))
        call.resolve(result)
    }

    private fun modelsArray(): JSArray {
        val models = JSArray()
        for (candidate in engine.listModels(context)) {
            models.put(describe(candidate))
        }
        return models
    }

    private fun describe(candidate: ModelCandidate) = JSObject().apply {
        put("id", candidate.id)
        put("path", candidate.path)
        put("sizeBytes", candidate.sizeBytes)
        put("family", candidate.family)
        put("imported", candidate.imported)
        put("selected", candidate.selected)
    }

    /**
     * Opens the system document picker and copies the chosen file into the
     * app's own storage.
     *
     * This exists because the documented alternative — put the file in
     * `Android/data/…/files/models/` yourself — stopped being followable on a
     * phone with no computer attached: since Android 11 that directory is
     * hidden from third-party file managers. The picker reaches Downloads, an
     * SD card or Drive with no storage permission at all, which is both the
     * easier route and the one that does not ask for `MANAGE_EXTERNAL_STORAGE`.
     *
     * resolves: `{imported, cancelled, model?: {...}, replacedExisting?}`.
     * Backing out of the picker resolves with `cancelled: true` rather than
     * rejecting — deciding not to pick a file is not an error.
     *
     * While copying, emits `importProgress` carrying `{copiedBytes,
     * totalBytes, percent}`; a half-gigabyte copy is slow enough that a UI
     * with no progress reads as a hang.
     */
    @PluginMethod
    fun importModel(call: PluginCall) {
        if (importer.isRunning) {
            call.reject("An import is already running", "busy")
            return
        }
        startActivityForResult(call, importer.pickIntent(), "modelPicked")
    }

    @ActivityCallback
    fun modelPicked(call: PluginCall?, result: ActivityResult) {
        if (call == null) return

        val uri = result.data?.data
        if (result.resultCode != Activity.RESULT_OK || uri == null) {
            call.resolve(JSObject().apply {
                put("imported", false)
                put("cancelled", true)
            })
            return
        }

        importer.importFrom(context, uri, object : ModelImporter.Listener {
            override fun onProgress(copiedBytes: Long, totalBytes: Long) {
                notifyListeners("importProgress", JSObject().apply {
                    put("copiedBytes", copiedBytes)
                    put("totalBytes", totalBytes)
                    put("percent", if (totalBytes > 0) (copiedBytes * 100 / totalBytes).toInt() else -1)
                })
            }

            override fun onDone(candidate: ModelCandidate, replacedExisting: Boolean) {
                // Whatever is in memory is now the wrong model, or the same
                // file's previous contents. Dropping it costs one reload and
                // removes every way for the two to disagree.
                engine.unload()
                call.resolve(JSObject().apply {
                    put("imported", true)
                    put("cancelled", false)
                    put("replacedExisting", replacedExisting)
                    put("model", describe(candidate.copy(imported = true, selected = true)))
                })
            }

            override fun onError(message: String, code: String) {
                if (code == "cancelled") {
                    call.resolve(JSObject().apply {
                        put("imported", false)
                        put("cancelled", true)
                    })
                } else {
                    call.reject(message, code)
                }
            }
        })
    }

    /** Abandons an in-flight [importModel]. The partial file is cleaned up. */
    @PluginMethod
    fun cancelImport(call: PluginCall) {
        importer.cancel()
        call.resolve()
    }

    /**
     * options: `{ path: string }` — deletes a model this app imported.
     * Refuses paths outside the app's own model directories, so a bug upstream
     * cannot turn this into a general-purpose delete.
     */
    @PluginMethod
    fun removeModel(call: PluginCall) {
        val path = call.getString("path")
        if (path.isNullOrBlank()) {
            call.reject("Missing \"path\"", "invalid_input")
            return
        }
        if (!ModelStore.isImported(context, path)) {
            call.reject("That model wasn't imported by this app, so it isn't ours to delete.", "not_removable")
            return
        }

        val loaded = engine.availability(context).modelPath
        if (loaded == path) engine.unload()

        if (!importer.remove(context, path)) {
            call.reject("Couldn't delete the model file.", "io_error")
            return
        }
        call.resolve(JSObject().apply {
            put("removed", true)
            put("models", modelsArray())
        })
    }

    /**
     * options: `{ path: string }` — makes one of the models on the device the
     * one that gets loaded, and remembers it across restarts. With nothing
     * selected the catalog picks the largest, which is a decent guess and a
     * poor override of somebody who meant the other one.
     */
    @PluginMethod
    fun selectModel(call: PluginCall) {
        val path = call.getString("path")
        if (path.isNullOrBlank()) {
            call.reject("Missing \"path\"", "invalid_input")
            return
        }
        if (!File(path).isFile) {
            call.reject("That model file is no longer on the device.", "not_found")
            return
        }
        if (engine.availability(context).modelPath != path) engine.unload()
        ModelStore.select(context, path)
        call.resolve(JSObject().apply {
            put("selected", path)
            put("models", modelsArray())
        })
    }

    /**
     * options: { modelPath?: string, template?: "auto"|"gemma"|"llama3"|"phi3"|"chatml"|"plain" }
     *
     * Resolves once the model is in memory, which takes seconds for a
     * multi-gigabyte file. Callers are expected to start this at launch rather
     * than let the first message pay for it.
     */
    @PluginMethod
    fun loadModel(call: PluginCall) {
        val modelPath = call.getString("modelPath")
        val template = call.getString("template")?.takeIf { it.isNotBlank() && it != "auto" }
        engine.load(context, modelPath, template) { outcome ->
            if (outcome.loaded) {
                val result = JSObject()
                result.put("loaded", true)
                result.put("modelId", outcome.modelId)
                result.put("backend", outcome.backend)
                result.put("loadMillis", outcome.loadMillis)
                call.resolve(result)
            } else {
                call.reject(outcome.error ?: "Model failed to load", "model_load_failed")
            }
        }
    }

    @PluginMethod
    fun unloadModel(call: PluginCall) {
        engine.unload()
        call.resolve()
    }

    /** Stops an in-flight [generate]. Safe to call when nothing is running. */
    @PluginMethod
    fun cancel(call: PluginCall) {
        engine.cancel()
        call.resolve()
    }

    /**
     * options: { system: string, messages: [{role, content}], maxTokens?, temperature? }
     * resolves: { response: string, emotion: string | null }
     *
     * Returns the same two fields `parseReply()` already extracts from a cloud
     * provider's completion, parsed here rather than left as a raw string,
     * because on-device output needs repair the cloud path gets for free — no
     * JSON mode exists in this runtime, so a small model's code fences and
     * stray preamble have to be cleaned up somewhere ([StructuredReply]).
     *
     * While generating, emits `generateToken` events carrying `{token,
     * partial}`. `partial` is the visible reply so far with the JSON
     * scaffolding already stripped, so the UI can stream text straight into a
     * bubble without reimplementing the parser in JavaScript.
     */
    @PluginMethod
    fun generate(call: PluginCall) {
        val system = call.getString("system")
        if (system.isNullOrEmpty()) {
            call.reject("Missing \"system\" prompt", "invalid_input")
            return
        }

        val rawMessages: JSArray = call.getArray("messages") ?: JSArray()
        val messages = ArrayList<ChatMessage>()
        for (i in 0 until rawMessages.length()) {
            val obj = rawMessages.getJSONObject(i)
            val role = obj.optString("role", "user")
            val content = obj.optString("content", "")
            if (content.isNotEmpty()) messages.add(ChatMessage(role, content))
        }

        val request = GenerateRequest(
            system = system,
            messages = messages,
            maxTokens = call.getInt("maxTokens") ?: 320,
            temperature = (call.getDouble("temperature") ?: 0.85).toFloat()
        )

        val raw = StringBuilder()
        engine.generate(context, request, object : LlmEngine.Callback {
            override fun onToken(token: String) {
                raw.append(token)
                val event = JSObject()
                event.put("token", token)
                event.put("partial", StructuredReply.partialResponse(raw.toString()))
                notifyListeners("generateToken", event)
            }

            override fun onComplete(response: String, emotion: String?) {
                val result = JSObject()
                result.put("response", response)
                result.put("emotion", emotion)
                call.resolve(result)
            }

            override fun onError(message: String, code: String) {
                call.reject(message, code)
            }
        })
    }
}
