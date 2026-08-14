package ai.companion.pixel.llm

import android.content.Context

/** One turn of conversation, in the order the model should read them. */
data class ChatMessage(val role: String, val content: String)

data class GenerateRequest(
    val system: String,
    val messages: List<ChatMessage>,
    val maxTokens: Int,
    val temperature: Float
)

data class AvailabilityStatus(val available: Boolean, val reason: String?)

data class LoadOutcome(val loaded: Boolean, val modelId: String?, val error: String?)

/**
 * What a local inference backend must do to plug into [CompanionLocalLlmPlugin].
 *
 * Two implementations are expected over time:
 *  - StubLlmEngine (this file's neighbour): always unavailable. What ships today.
 *  - A real engine (LiteRT-LM first choice, llama.cpp/GGUF as fallback — see
 *    ../../../../../../LOCAL_AI_INVESTIGATION.md at the repo root for why),
 *    added later as its own class implementing this same interface. The
 *    plugin, the JS provider glue, and every system above them stay
 *    unchanged when that swap happens.
 */
interface LlmEngine {

    /** Cheap, synchronous-ish check: is there a usable model right now? */
    fun availability(context: Context): AvailabilityStatus

    /** Load (or confirm already-loaded) a model. modelPath is engine-specific. */
    fun load(context: Context, modelPath: String?): LoadOutcome

    fun unload()

    /**
     * Runs generation. Implementations that support streaming should call
     * [Callback.onToken] as tokens arrive and [Callback.onComplete] once,
     * at the end, with the full assembled response. Implementations that
     * only produce a full completion should skip onToken and call
     * onComplete directly — the plugin and the JS side both treat streaming
     * as optional.
     */
    fun generate(request: GenerateRequest, callback: Callback)

    interface Callback {
        fun onToken(token: String)
        fun onComplete(response: String, emotion: String?)
        fun onError(message: String, code: String)
    }
}
