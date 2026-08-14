package ai.companion.pixel.llm

import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

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

    override fun handleOnDestroy() {
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
        call.resolve(result)
    }

    /** Every model file on the device, so the UI can name one instead of guessing. */
    @PluginMethod
    fun listModels(call: PluginCall) {
        val models = JSArray()
        for (candidate in engine.listModels(context)) {
            val entry = JSObject()
            entry.put("id", candidate.id)
            entry.put("path", candidate.path)
            entry.put("sizeBytes", candidate.sizeBytes)
            entry.put("family", candidate.family)
            models.put(entry)
        }
        val result = JSObject()
        result.put("models", models)
        result.put("modelDir", ModelCatalog.preferredDropDir(context))
        call.resolve(result)
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
