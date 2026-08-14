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
 * This is scaffolding, not a working inference engine: [engine] is a stub that
 * always reports itself unavailable, because no model is bundled with the app
 * yet (see README.md in this package for why, and for what plugging in a real
 * engine looks like). The JS side already treats an unavailable local provider
 * as a normal, expected case — same code path as a cloud provider with no key
 * configured — so wiring this plugin in ahead of the real engine costs nothing
 * and means the eventual swap is a one-file change ([LlmEngine] only).
 *
 * Method shapes mirror server/proxy.js's /api/chat contract on purpose: the
 * same {system, messages} in, {response, emotion} JSON out. Nothing upstream
 * of this plugin (character, personality, memory, mood, relationship, sprite,
 * event systems) needs to know inference happened on-device instead of on
 * NVIDIA's servers.
 */
@CapacitorPlugin(name = "CompanionLocalLlm")
class CompanionLocalLlmPlugin : Plugin() {

    private val engine: LlmEngine = StubLlmEngine()

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        val status = engine.availability(context)
        val result = JSObject()
        result.put("available", status.available)
        result.put("reason", status.reason)
        call.resolve(result)
    }

    @PluginMethod
    fun loadModel(call: PluginCall) {
        val modelPath = call.getString("modelPath")
        val outcome = engine.load(context, modelPath)
        if (outcome.loaded) {
            val result = JSObject()
            result.put("loaded", true)
            result.put("modelId", outcome.modelId)
            call.resolve(result)
        } else {
            call.reject(outcome.error ?: "Model failed to load", "model_load_failed")
        }
    }

    @PluginMethod
    fun unloadModel(call: PluginCall) {
        engine.unload()
        call.resolve()
    }

    /**
     * options: { system: string, messages: [{role, content}], maxTokens?, temperature? }
     * resolves: { response: string, emotion: string | null }
     *
     * Deliberately returns the same two-field shape parseReply() already
     * expects from a cloud provider's raw completion, extracted here rather
     * than left as a raw string, so a future streaming implementation can
     * assemble tokens into `response` and only need to decide `emotion` once
     * generation finishes — no change to the JS-side parser either way.
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

        val maxTokens = if (call.getInt("maxTokens") != null) call.getInt("maxTokens") else 320
        val temperature = if (call.getDouble("temperature") != null) call.getDouble("temperature") else 0.85

        val request = GenerateRequest(
            system = system,
            messages = messages,
            maxTokens = maxTokens ?: 320,
            temperature = (temperature ?: 0.85).toFloat()
        )

        engine.generate(request, object : LlmEngine.Callback {
            override fun onToken(token: String) {
                // Streaming hookup point: emit as a Capacitor event so the JS
                // side can append tokens to the visible reply as they arrive.
                // Not used by StubLlmEngine (see llm/README.md).
                val event = JSObject()
                event.put("token", token)
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
