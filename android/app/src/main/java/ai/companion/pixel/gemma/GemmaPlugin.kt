package ai.companion.pixel.gemma

import android.app.Activity
import android.content.Intent
import android.provider.OpenableColumns
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.IOException
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Bridges the companion's provider abstraction to a single, self-contained
 * Gemma `.task` model, imported by the user through the system file picker.
 *
 * This is a new, independent plugin — not a wrapper around
 * [ai.companion.pixel.llm.CompanionLocalLlmPlugin] and not registered under
 * its name. It exists because that plugin's registration was never
 * confirmed reaching the WebView on a real device, and this one is meant to
 * stand alone rather than depend on diagnosing that further.
 *
 * Method shapes mirror the same `{system, messages}` in, `{response,
 * emotion}` out contract every provider uses, so the JS side treats this
 * exactly like any other provider.
 */
@CapacitorPlugin(name = "CompanionGemma")
class GemmaPlugin : Plugin() {

    private companion object {
        const val TAG = "CompanionGemma"
        const val BUFFER_BYTES = 1 shl 20
        const val PROGRESS_STEP_BYTES = 8L shl 20
    }

    private val engine = GemmaEngine()
    private val importWorker = Executors.newSingleThreadExecutor { r ->
        Thread(r, "companion-gemma-import").apply { isDaemon = true }
    }
    private val importCancelled = AtomicBoolean(false)
    @Volatile private var importing = false

    /**
     * Called by PluginHandle right after Capacitor constructs this plugin and
     * sets its bridge/context — i.e. exactly when registration actually
     * completes, not merely when the class is present in the dex. Temporary
     * logging, for confirming JS -> Capacitor -> GemmaPlugin bridge
     * connectivity via `adb logcat -s CompanionGemma`.
     */
    override fun load() {
        android.util.Log.i(TAG, "GemmaPlugin.load() — registered with the bridge as \"CompanionGemma\"")
    }

    override fun handleOnDestroy() {
        importCancelled.set(true)
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
        result.put("sizeBytes", status.sizeBytes)
        result.put("backend", status.backend)
        result.put("modelPath", status.modelPath) // TEMP DEBUG
        // TEMP DEBUG — same event as "loaded" in this architecture: the model
        // file is memory-mapped and LlmInference constructed in one native
        // call (LlmInference.createFromOptions), so there is no separate
        // "engine initialized but model not loaded" state to report here.
        result.put("engineInitialized", status.loaded)
        call.resolve(result)
    }

    /**
     * Opens the system document picker and copies the chosen file into this
     * plugin's own fixed model slot, replacing whatever was there before.
     *
     * resolves: `{imported, cancelled, error?}`. Backing out of the picker
     * resolves with `cancelled: true` rather than rejecting.
     */
    @PluginMethod
    fun importModel(call: PluginCall) {
        if (importing) {
            call.reject("An import is already running", "busy")
            return
        }
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
            putExtra(Intent.EXTRA_LOCAL_ONLY, false)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        startActivityForResult(call, intent, "modelPicked")
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

        importCancelled.set(false)
        importing = true
        val app = context.applicationContext

        importWorker.execute {
            try {
                val resolver = app.contentResolver
                val displayName = queryDisplayName(uri) ?: uri.lastPathSegment?.substringAfterLast('/')
                if (displayName.isNullOrBlank()) {
                    call.reject("Couldn't read that file's name. Try picking it from Downloads.", "unreadable")
                    return@execute
                }
                val declaredSize = querySize(uri)

                val target = GemmaModelStore.modelFile(app)
                val part = GemmaModelStore.partFile(app)

                val stream = try {
                    resolver.openInputStream(uri)
                } catch (e: SecurityException) {
                    null
                } catch (e: IOException) {
                    null
                }
                if (stream == null) {
                    call.reject("Couldn't open that file. Try picking it from Downloads.", "unreadable")
                    return@execute
                }

                stream.use { input ->
                    part.delete()
                    var copied = 0L
                    var reported = 0L
                    part.outputStream().use { output ->
                        val buffer = ByteArray(BUFFER_BYTES)
                        while (true) {
                            if (importCancelled.get()) {
                                part.delete()
                                call.resolve(JSObject().apply {
                                    put("imported", false)
                                    put("cancelled", true)
                                })
                                return@execute
                            }
                            val read = input.read(buffer)
                            if (read < 0) break
                            output.write(buffer, 0, read)
                            copied += read
                            if (copied - reported >= PROGRESS_STEP_BYTES) {
                                reported = copied
                                notifyListeners("importProgress", JSObject().apply {
                                    put("copiedBytes", copied)
                                    put("totalBytes", declaredSize)
                                    put("percent", if (declaredSize > 0) (copied * 100 / declaredSize).toInt() else -1)
                                })
                            }
                        }
                        output.flush()
                    }

                    if (copied < GemmaModelStore.MIN_SIZE_BYTES) {
                        part.delete()
                        call.reject(
                            "Only ${copied / (1024 * 1024)} MB came through — that's too small to be a real " +
                                "Gemma bundle. Check the file and try again.",
                            "invalid_model"
                        )
                        return@execute
                    }

                    target.delete()
                    if (!part.renameTo(target)) {
                        part.delete()
                        call.reject("Couldn't finish writing the model into app storage.", "io_error")
                        return@execute
                    }

                    GemmaModelStore.remember(app, displayName)
                    engine.unload()

                    call.resolve(JSObject().apply {
                        put("imported", true)
                        put("cancelled", false)
                        put("modelId", displayName)
                        put("sizeBytes", target.length())
                    })
                }
            } catch (t: Throwable) {
                call.reject(t.message ?: "The import failed.", "io_error")
            } finally {
                importing = false
            }
        }
    }

    @PluginMethod
    fun cancelImport(call: PluginCall) {
        importCancelled.set(true)
        call.resolve()
    }

    @PluginMethod
    fun removeModel(call: PluginCall) {
        engine.unload()
        val removed = GemmaModelStore.delete(context)
        if (!removed) {
            call.reject("Couldn't delete the model file.", "io_error")
            return
        }
        call.resolve(JSObject().apply { put("removed", true) })
    }

    @PluginMethod
    fun loadModel(call: PluginCall) {
        engine.load(context) { outcome ->
            if (outcome.loaded) {
                call.resolve(JSObject().apply {
                    put("loaded", true)
                    put("backend", outcome.backend)
                    put("loadMillis", outcome.loadMillis)
                })
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

    @PluginMethod
    fun cancel(call: PluginCall) {
        engine.cancel()
        call.resolve()
    }

    /**
     * options: { system: string, messages: [{role, content}], maxTokens?, temperature? }
     * resolves: { response: string, emotion: string | null, ...TEMP DEBUG timing/rawOutput fields }
     */
    @PluginMethod
    fun generate(call: PluginCall) {
        val system = call.getString("system")
        if (system.isNullOrEmpty()) {
            call.reject("Missing \"system\" prompt", "invalid_input")
            return
        }

        val rawMessages: JSArray = call.getArray("messages") ?: JSArray()
        val messages = ArrayList<GemmaMessage>()
        for (i in 0 until rawMessages.length()) {
            val obj = rawMessages.getJSONObject(i)
            val role = obj.optString("role", "user")
            val content = obj.optString("content", "")
            if (content.isNotEmpty()) messages.add(GemmaMessage(role, content))
        }

        val request = GemmaGenerateRequest(
            system = system,
            messages = messages,
            temperature = (call.getDouble("temperature") ?: 0.85).toFloat()
        )

        val streamed = StringBuilder()
        engine.generate(context, request, object : GemmaEngine.Callback {
            override fun onToken(token: String) {
                streamed.append(token)
                notifyListeners("gemmaToken", JSObject().apply {
                    put("token", token)
                    put("partial", GemmaReply.partialResponse(streamed.toString()))
                })
            }

            override fun onComplete(response: String, emotion: String?, timing: GemmaTiming) {
                call.resolve(JSObject().apply {
                    put("response", response)
                    put("emotion", emotion)
                    // TEMP DEBUG — everything below, for the execution-path report.
                    put("modelLoadMs", timing.modelLoadMs)
                    put("promptPrepMs", timing.promptPrepMs)
                    put("inferenceMs", timing.inferenceMs)
                    put("responseProcessingMs", timing.responseProcessingMs)
                    put("rawOutput", timing.rawOutput.take(4000))
                    put("inferenceThread", timing.inferenceThread)
                    put("engineInitialized", true)
                    put("finalPrompt", timing.finalPrompt.take(6000))
                    put("promptTokens", timing.promptTokens)
                    put("outputTokens", timing.outputTokens)
                    put("nativeCompletedAtMs", System.currentTimeMillis())
                })
            }

            override fun onError(message: String, code: String) {
                call.reject(message, code)
            }
        })
    }

    private fun queryDisplayName(uri: android.net.Uri): String? = queryColumn(uri) { cursor ->
        val index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        if (index >= 0 && !cursor.isNull(index)) cursor.getString(index) else null
    }

    private fun querySize(uri: android.net.Uri): Long = queryColumn(uri) { cursor ->
        val index = cursor.getColumnIndex(OpenableColumns.SIZE)
        if (index >= 0 && !cursor.isNull(index)) cursor.getLong(index) else null
    } ?: -1L

    private fun <T> queryColumn(uri: android.net.Uri, read: (android.database.Cursor) -> T?): T? = try {
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) read(cursor) else null
        }
    } catch (t: Throwable) {
        null
    }
}
