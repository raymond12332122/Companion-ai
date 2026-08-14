package ai.companion.pixel.gemma

import android.content.Context
import android.util.Log
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import com.google.mediapipe.tasks.genai.llminference.LlmInferenceSession
import com.google.mediapipe.tasks.genai.llminference.ProgressListener
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

data class GemmaMessage(val role: String, val content: String)

data class GemmaGenerateRequest(
    val system: String,
    val messages: List<GemmaMessage>,
    val temperature: Float
)

data class GemmaAvailability(
    val available: Boolean,
    val loaded: Boolean,
    val reason: String?,
    val modelId: String?,
    val sizeBytes: Long,
    val backend: String?
)

data class GemmaLoadOutcome(val loaded: Boolean, val backend: String?, val error: String?, val loadMillis: Long)

/**
 * On-device inference for a single Gemma `.task` bundle through MediaPipe's
 * LLM Inference API (the LiteRT-LM runtime for Android). This is a
 * self-contained sibling to [ai.companion.pixel.llm.MediaPipeLlmEngine], not
 * a caller of it: same underlying Google runtime (there is no other
 * Android-compatible way to run a `.task` bundle), but its own model slot,
 * its own chat template, its own lifecycle, and no shared code.
 *
 * One worker thread owns the native handle for its whole life, matching the
 * runtime's own threading requirement — `LlmInference` is not safe to drive
 * concurrently, and loading and generation both block for real time.
 */
class GemmaEngine {

    private companion object {
        const val TAG = "CompanionGemma"
        const val CONTEXT_TOKENS = 2048
        const val MIN_CONTEXT_TOKENS = 1024
        const val MAX_TOP_K = 64
        const val SESSION_TOP_K = 40
        const val SESSION_TOP_P = 0.95f
    }

    private val worker = Executors.newSingleThreadExecutor { runnable ->
        Thread(runnable, "companion-gemma").apply { isDaemon = true }
    }

    @Volatile private var inference: LlmInference? = null
    @Volatile private var session: LlmInferenceSession? = null
    @Volatile private var loadedBackend: String? = null
    @Volatile private var loadedPath: String? = null

    private val generating = AtomicBoolean(false)

    fun availability(context: Context): GemmaAvailability {
        val file = GemmaModelStore.modelFile(context)
        if (loadedPath != null && inference != null) {
            return GemmaAvailability(
                available = true,
                loaded = true,
                reason = null,
                modelId = GemmaModelStore.displayName(context) ?: "gemma-model.task",
                sizeBytes = file.length(),
                backend = loadedBackend
            )
        }
        if (!file.isFile) {
            return GemmaAvailability(false, false, "no_model_imported", null, 0L, null)
        }
        return GemmaAvailability(
            available = true,
            loaded = false,
            reason = "not_loaded",
            modelId = GemmaModelStore.displayName(context) ?: "gemma-model.task",
            sizeBytes = file.length(),
            backend = null
        )
    }

    fun load(context: Context, callback: (GemmaLoadOutcome) -> Unit) {
        val app = context.applicationContext
        worker.execute {
            try {
                callback(loadBlocking(app))
            } catch (t: Throwable) {
                Log.e(TAG, "Model load failed", t)
                callback(GemmaLoadOutcome(false, null, describe(t), 0L))
            }
        }
    }

    /** Runs on [worker]. */
    private fun loadBlocking(context: Context): GemmaLoadOutcome {
        val file = GemmaModelStore.modelFile(context)
        if (!file.isFile) {
            return GemmaLoadOutcome(false, null, "No Gemma model imported yet.", 0L)
        }

        if (loadedPath == file.absolutePath && inference != null) {
            return GemmaLoadOutcome(true, loadedBackend, null, 0L)
        }

        releaseBlocking()

        val started = System.currentTimeMillis()
        val attempts = linkedSetOf(
            LlmInference.Backend.GPU to CONTEXT_TOKENS,
            LlmInference.Backend.CPU to CONTEXT_TOKENS,
            LlmInference.Backend.CPU to MIN_CONTEXT_TOKENS
        )

        var lastFailure: Throwable? = null
        for ((backend, tokens) in attempts) {
            try {
                val options = LlmInference.LlmInferenceOptions.builder()
                    .setModelPath(file.absolutePath)
                    .setMaxTokens(tokens)
                    .setMaxTopK(MAX_TOP_K)
                    .setPreferredBackend(backend)
                    .build()
                inference = LlmInference.createFromOptions(context, options)
                loadedPath = file.absolutePath
                loadedBackend = backend.name.lowercase()

                val elapsed = System.currentTimeMillis() - started
                Log.i(TAG, "Loaded Gemma model on $backend, $tokens tokens, in ${elapsed}ms")
                return GemmaLoadOutcome(true, loadedBackend, null, elapsed)
            } catch (t: Throwable) {
                lastFailure = t
                Log.w(TAG, "Load attempt failed ($backend, $tokens tokens)", t)
            }
        }

        return GemmaLoadOutcome(false, null, lastFailure?.let { describe(it) } ?: "Model failed to load", 0L)
    }

    fun generate(context: Context, request: GemmaGenerateRequest, callback: Callback) {
        val app = context.applicationContext
        if (!generating.compareAndSet(false, true)) {
            callback.onError("A reply is already being generated", "busy")
            return
        }

        worker.execute {
            try {
                if (inference == null) {
                    val outcome = loadBlocking(app)
                    if (!outcome.loaded) {
                        callback.onError(outcome.error ?: "Model failed to load", "model_load_failed")
                        return@execute
                    }
                }
                generateBlocking(request, callback)
            } catch (t: Throwable) {
                Log.e(TAG, "Generation failed", t)
                callback.onError(describe(t), "generation_failed")
            } finally {
                generating.set(false)
            }
        }
    }

    /** Runs on [worker]. */
    private fun generateBlocking(request: GemmaGenerateRequest, callback: Callback) {
        val engine = inference ?: run {
            callback.onError("No model is loaded", "not_loaded")
            return
        }

        val prompt = formatGemmaPrompt(request.system, request.messages)

        val sessionOptions = LlmInferenceSession.LlmInferenceSessionOptions.builder()
            .setTopK(SESSION_TOP_K)
            .setTopP(SESSION_TOP_P)
            .setTemperature(request.temperature.coerceIn(0.05f, 2.0f))
            .setRandomSeed(System.nanoTime().toInt())
            .build()

        val active = LlmInferenceSession.createFromOptions(engine, sessionOptions)
        session = active

        val assembled = StringBuilder()
        try {
            active.addQueryChunk(prompt)

            val future = active.generateResponseAsync(ProgressListener<String> { partial, _ ->
                if (!partial.isNullOrEmpty()) {
                    assembled.append(partial)
                    callback.onToken(partial)
                }
            })

            val returned = future.get() ?: ""
            val raw = if (returned.length >= assembled.length) returned else assembled.toString()

            val trimmed = trimAtGemmaStop(raw)
            val parsed = GemmaReply.extract(trimmed)
            if (parsed.response.isBlank()) {
                callback.onError("The model returned an empty reply", "empty_reply")
            } else {
                callback.onComplete(parsed.response, parsed.emotion)
            }
        } finally {
            session = null
            try {
                active.close()
            } catch (t: Throwable) {
                Log.w(TAG, "Session close failed", t)
            }
        }
    }

    /**
     * Gemma has no system role; the convention its instruction tuning used is
     * to fold the system text into the first user turn.
     */
    private fun formatGemmaPrompt(system: String, messages: List<GemmaMessage>): String {
        val out = StringBuilder()
        var systemPending = system.isNotBlank()
        for (message in messages) {
            val isAssistant = message.role == "assistant" || message.role == "model" || message.role == "bot"
            if (isAssistant) {
                out.append("<start_of_turn>model\n").append(message.content).append("<end_of_turn>\n")
            } else {
                out.append("<start_of_turn>user\n")
                if (systemPending) {
                    out.append(system).append("\n\n")
                    systemPending = false
                }
                out.append(message.content).append("<end_of_turn>\n")
            }
        }
        if (systemPending) {
            out.append("<start_of_turn>user\n").append(system).append("<end_of_turn>\n")
        }
        out.append("<start_of_turn>model\n")
        return out.toString()
    }

    private fun trimAtGemmaStop(text: String): String {
        var cut = text.length
        for (stop in listOf("<end_of_turn>", "<start_of_turn>")) {
            val index = text.indexOf(stop)
            if (index in 0 until cut) cut = index
        }
        return text.substring(0, cut)
    }

    fun cancel() {
        val active = session ?: return
        try {
            active.cancelGenerateResponseAsync()
        } catch (t: Throwable) {
            Log.w(TAG, "Cancel failed", t)
        }
    }

    fun unload() {
        cancel()
        worker.execute { releaseBlocking() }
    }

    /** Runs on [worker]. */
    private fun releaseBlocking() {
        try {
            session?.close()
        } catch (t: Throwable) {
            Log.w(TAG, "Session close failed during unload", t)
        }
        session = null
        try {
            inference?.close()
        } catch (t: Throwable) {
            Log.w(TAG, "Engine close failed during unload", t)
        }
        inference = null
        loadedPath = null
        loadedBackend = null
    }

    private fun describe(t: Throwable): String {
        val cause = generateSequence(t) { it.cause }.last()
        val message = cause.message?.takeIf { it.isNotBlank() } ?: cause::class.java.simpleName
        return message.lineSequence().first().take(300)
    }

    interface Callback {
        fun onToken(token: String)
        fun onComplete(response: String, emotion: String?)
        fun onError(message: String, code: String)
    }
}
