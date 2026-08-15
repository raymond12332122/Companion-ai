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

/**
 * What the JS side needs to decide between "use the device" and "fall back".
 *
 * [available] and [loaded] are deliberately separate. A model sitting on disk
 * that hasn't been read into memory yet is *available* — the provider can
 * serve a reply — but not *loaded*, and loading a multi-gigabyte file takes
 * long enough (seconds) that the caller wants to kick it off at startup
 * rather than discover it inside the first message's timeout budget.
 */
data class AvailabilityStatus(
    val available: Boolean,
    val loaded: Boolean,
    val reason: String?,
    val modelId: String? = null,
    val modelPath: String? = null,
    val sizeBytes: Long = 0L,
    val backend: String? = null
)

data class LoadOutcome(
    val loaded: Boolean,
    val modelId: String?,
    val error: String?,
    val backend: String? = null,
    val loadMillis: Long = 0L
)

/**
 * What a local inference backend must do to plug into [CompanionLocalLlmPlugin].
 *
 * Two implementations ship:
 *  - [MediaPipeLlmEngine] — the real one, LiteRT-LM via MediaPipe's LLM
 *    Inference API. Used by default.
 *  - [StubLlmEngine] — always unavailable. Kept as the reference minimum an
 *    implementation has to satisfy, and as the one-line swap for builds that
 *    want the plugin present but no inference (see this package's README).
 *
 * Everything here is asynchronous where it can block. Model loading reads
 * gigabytes off disk and generation runs for seconds to minutes; neither may
 * happen on the thread Capacitor delivers the call on, because that thread is
 * also how the WebView gets told the call finished.
 */
interface LlmEngine {

    /** Cheap: file-existence and in-memory-state check. Safe to call often. */
    fun availability(context: Context): AvailabilityStatus

    /** Every model file the engine can see, best candidate first. */
    fun listModels(context: Context): List<ModelCandidate>

    /**
     * Load (or confirm already-loaded) a model. [modelPath] selects a specific
     * file; null means "pick the best candidate yourself". [template] forces a
     * chat template family, overriding the one inferred from the filename.
     */
    fun load(context: Context, modelPath: String?, template: String?, callback: (LoadOutcome) -> Unit)

    fun unload()

    /** Ask an in-flight [generate] to stop. No-op when nothing is running. */
    fun cancel()

    /**
     * Runs generation. Implementations that support streaming call
     * [Callback.onToken] as tokens arrive and [Callback.onComplete] once, at
     * the end, with the full assembled response. Implementations that only
     * produce a full completion skip onToken and call onComplete directly —
     * the plugin and the JS side both treat streaming as optional.
     */
    fun generate(context: Context, request: GenerateRequest, callback: Callback)

    interface Callback {
        fun onToken(token: String)
        fun onComplete(response: String, emotion: String?)
        fun onError(message: String, code: String)
    }
}
