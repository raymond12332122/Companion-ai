package ai.companion.pixel.gemma

import android.content.Context
import android.util.Log
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import com.google.mediapipe.tasks.genai.llminference.LlmInferenceSession
import com.google.mediapipe.tasks.genai.llminference.ProgressListener
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

data class GemmaMessage(val role: String, val content: String)

data class GemmaGenerateRequest(
    val system: String,
    val messages: List<GemmaMessage>,
    val temperature: Float,
    // TEMP DEBUG — null preserves current behavior (no cap) for the normal
    // companion flow. LlmInferenceSessionOptions exposes no max-output-
    // tokens setting (confirmed by decompiling the .aar's Builder class:
    // setTopK/setTopP/setTemperature/setRandomSeed/setLoraPath/
    // setGraphOptions/setConstraintHandle/setPromptTemplates, nothing for
    // output length), so this is enforced by cancelling generation once the
    // exact tokenizer-measured output count reaches the cap — the model
    // still produced every token itself, this just stops asking for more.
    val maxOutputTokens: Int? = null
)

data class GemmaAvailability(
    val available: Boolean,
    val loaded: Boolean,
    val reason: String?,
    val modelId: String?,
    val sizeBytes: Long,
    val backend: String?,
    val modelPath: String? = null // TEMP DEBUG
)

data class GemmaLoadOutcome(val loaded: Boolean, val backend: String?, val error: String?, val loadMillis: Long)

/**
 * TEMP DEBUG — timing/raw-output breakdown for one generate() call, so a
 * lag report can say which stage actually took the time instead of guessing.
 * [rawOutput] is the model's text before trimAtGemmaStop/GemmaReply.extract
 * touch it — exactly what the native engine produced, unedited.
 */
data class GemmaTiming(
    val modelLoadMs: Long,
    val promptPrepMs: Long,
    val inferenceMs: Long,
    val responseProcessingMs: Long,
    val rawOutput: String,
    val inferenceThread: String,
    val finalPrompt: String,     // exactly what was passed to addQueryChunk(), unedited
    val promptTokens: Int,       // LlmInferenceSession.sizeInTokens(finalPrompt) — exact, not estimated
    val outputTokens: Int        // LlmInferenceSession.sizeInTokens(rawOutput) — exact, not estimated
)

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

    /**
     * Runs at Process.THREAD_PRIORITY_BACKGROUND, not the JVM-level default
     * this thread would otherwise inherit. This is the actual fix for
     * inference dropping UI frames: this thread was already off the main
     * thread (Capacitor posts every @PluginMethod call to its own background
     * taskHandler before GemmaPlugin is even entered, and this executor
     * isolates load()/generate() further still — verified by reading
     * Bridge.java, not assumed) — the WebView's render thread and this one
     * were never the same thread. They were, however, scheduled as equals:
     * on Android, a plain background Thread gets the CFS scheduler's default
     * niceness, so a CPU-bound thread here competed for cores on equal
     * footing with whatever renders the next frame. Process.setThreadPriority
     * moves that footing — the kernel now prefers latency-sensitive threads
     * over this one when both want the same core at the same instant. It
     * changes nothing about what gets computed, only how eagerly it yields
     * the CPU; the model's output is identical either way. Set once, here,
     * because the thread — not the work submitted to it — is what carries a
     * priority, and every load()/generate() call runs on this same thread
     * for its whole life (single-thread executor).
     */
    private val worker = Executors.newSingleThreadExecutor { runnable ->
        Thread({
            android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_BACKGROUND)
            runnable.run()
        }, "companion-gemma").apply { isDaemon = true }
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
                backend = loadedBackend,
                modelPath = loadedPath
            )
        }
        if (!file.isFile) {
            return GemmaAvailability(false, false, "no_model_imported", null, 0L, null, null)
        }
        return GemmaAvailability(
            available = true,
            loaded = false,
            reason = "not_loaded",
            modelId = GemmaModelStore.displayName(context) ?: "gemma-model.task",
            sizeBytes = file.length(),
            backend = null,
            modelPath = file.absolutePath
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

        // Runs on `worker`, Executors.newSingleThreadExecutor's own dedicated
        // background thread — this call returns to whatever thread invoked
        // generate() immediately after submitting here, it does not block it.
        // Capacitor's own Bridge.callPluginMethod() already posts every
        // @PluginMethod call (including this one) onto its own taskHandler
        // background thread before this method is even entered, so this
        // second hop is deliberate isolation, not the first time the work
        // leaves the caller — see GemmaPlugin.kt's threading note.
        worker.execute {
            var modelLoadMs = 0L // TEMP DEBUG
            try {
                if (inference == null) {
                    val loadStart = System.currentTimeMillis() // TEMP DEBUG
                    val outcome = loadBlocking(app)
                    modelLoadMs = System.currentTimeMillis() - loadStart // TEMP DEBUG
                    if (!outcome.loaded) {
                        callback.onError(outcome.error ?: "Model failed to load", "model_load_failed")
                        return@execute
                    }
                }
                generateBlocking(request, callback, modelLoadMs)
            } catch (t: Throwable) {
                Log.e(TAG, "Generation failed", t)
                callback.onError(describe(t), "generation_failed")
            } finally {
                generating.set(false)
            }
        }
    }

    /** Runs on [worker]. */
    private fun generateBlocking(request: GemmaGenerateRequest, callback: Callback, modelLoadMs: Long) {
        val engine = inference ?: run {
            callback.onError("No model is loaded", "not_loaded")
            return
        }

        val promptStart = System.currentTimeMillis() // TEMP DEBUG
        val prompt = formatGemmaPrompt(request.system, request.messages)
        val promptPrepMs = System.currentTimeMillis() - promptStart // TEMP DEBUG

        val sessionOptions = LlmInferenceSession.LlmInferenceSessionOptions.builder()
            .setTopK(SESSION_TOP_K)
            .setTopP(SESSION_TOP_P)
            .setTemperature(request.temperature.coerceIn(0.05f, 2.0f))
            .setRandomSeed(System.nanoTime().toInt())
            .build()

        val active = LlmInferenceSession.createFromOptions(engine, sessionOptions)
        session = active

        val assembled = StringBuilder()
        var cancelledForLength = false // TEMP DEBUG
        try {
            active.addQueryChunk(prompt)

            val inferenceStart = System.currentTimeMillis() // TEMP DEBUG
            val cap = request.maxOutputTokens // TEMP DEBUG
            val future = active.generateResponseAsync(ProgressListener<String> { partial, _ ->
                if (!partial.isNullOrEmpty()) {
                    assembled.append(partial)
                    callback.onToken(partial)
                    // TEMP DEBUG — no max-output-tokens API exists (see
                    // GemmaGenerateRequest doc), so the cap is enforced here:
                    // exact tokenizer count of what's assembled so far,
                    // checked after each chunk, cancel once it's enough.
                    if (cap != null && !cancelledForLength) {
                        val soFar = try { active.sizeInTokens(assembled.toString()) } catch (t: Throwable) { -1 }
                        if (soFar in cap..Int.MAX_VALUE) {
                            cancelledForLength = true
                            try {
                                active.cancelGenerateResponseAsync()
                            } catch (t: Throwable) {
                                Log.w(TAG, "Cancel-at-cap failed", t)
                            }
                        }
                    }
                }
            })

            // TEMP DEBUG — a length-cap cancellation is expected, not a
            // failure: future.get() may throw for it, in which case what was
            // already streamed into `assembled` is the real (truncated)
            // output, not an error.
            val raw = try {
                val returned = future.get() ?: ""
                if (returned.length >= assembled.length) returned else assembled.toString()
            } catch (t: Throwable) {
                if (cancelledForLength) {
                    assembled.toString()
                } else {
                    throw t
                }
            }
            val inferenceMs = System.currentTimeMillis() - inferenceStart // TEMP DEBUG
            // TEMP DEBUG — the model's actual output and exact token counts,
            // logged/captured before anything (stop-sequence trim, JSON/mood-
            // tag extraction) touches it. sizeInTokens() is the real tokenizer
            // via the API, not an estimate from counting stream callbacks.
            val promptTokens = try { active.sizeInTokens(prompt) } catch (t: Throwable) { -1 }
            val outputTokens = try { active.sizeInTokens(raw) } catch (t: Throwable) { -1 }
            Log.i(
                TAG,
                "Raw Gemma output (${raw.length} chars, $outputTokens tokens, prompt was $promptTokens tokens): " +
                    raw.take(2000)
            )

            val processingStart = System.currentTimeMillis() // TEMP DEBUG
            val trimmed = trimAtGemmaStop(raw)
            val parsed = GemmaReply.extract(trimmed)
            val responseProcessingMs = System.currentTimeMillis() - processingStart // TEMP DEBUG

            val timing = GemmaTiming(
                modelLoadMs, promptPrepMs, inferenceMs, responseProcessingMs, raw,
                inferenceThread = Thread.currentThread().name,
                finalPrompt = prompt,
                promptTokens = promptTokens,
                outputTokens = outputTokens
            ) // TEMP DEBUG
            if (parsed.response.isBlank()) {
                // TEMP DEBUG — this is exactly the "empty output" case being
                // diagnosed, so the raw text (even if blank) and token counts
                // go out with the error instead of being lost to logcat only.
                callback.onError(
                    "The model returned an empty reply. raw=" + JSONObject.quote(raw.take(500)) +
                        " promptTokens=$promptTokens outputTokens=$outputTokens rawLen=${raw.length}",
                    "empty_reply"
                )
            } else {
                callback.onComplete(parsed.response, parsed.emotion, timing)
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
     * Plain, unmarked text — no `<start_of_turn>`/`<end_of_turn>`.
     *
     * This engine used to hand-embed those as literal characters, which is
     * wrong for a `.task` bundle: MediaPipe's LLM Inference API applies the
     * model's own chat template internally for `.task`/`.litertlm` files
     * (confirmed against flutter_gemma, which wraps this same native API:
     * "MediaPipe handles chat templates internally" for `.task`, versus
     * "manual chat template formatting" being required only for raw
     * `.bin`/`.tflite` weights). Feeding it text that ALSO contains literal
     * `<start_of_turn>user`/`<end_of_turn>` doesn't skip templating, it
     * doubles it — the runtime wraps the whole thing again, so the model
     * sees its own turn markers duplicated and, in testing, garbled and
     * confused. This exact risk was already called out in the sibling
     * engine this package deliberately shares no code with — see
     * ai.companion.pixel.llm.ChatTemplate's PLAIN family and its comment:
     * "Newer .litertlm bundles can carry their own prompt template and apply
     * it inside the runtime, in which case adding markers here would double
     * them up." This is that same PLAIN approach, independently arrived at.
     */
    private fun formatGemmaPrompt(system: String, messages: List<GemmaMessage>): String {
        val out = StringBuilder()
        if (system.isNotBlank()) out.append(system).append("\n\n")
        for (message in messages) {
            val isAssistant = message.role == "assistant" || message.role == "model" || message.role == "bot"
            val label = if (isAssistant) "Assistant" else "User"
            out.append(label).append(": ").append(message.content).append("\n")
        }
        out.append("Assistant: ")
        return out.toString()
    }

    private fun trimAtGemmaStop(text: String): String {
        var cut = text.length
        // "\nUser:" matches the plain-text turn labels formatGemmaPrompt() now
        // uses, for a model that keeps going and starts writing the next
        // turn itself. The two <..._turn> markers are a safety net in case
        // the runtime's own internal template still surfaces its control
        // tokens as literal text in decoded output — harmless no-ops if it
        // doesn't.
        for (stop in listOf("\nUser:", "\nuser:", "<end_of_turn>", "<start_of_turn>")) {
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
        fun onComplete(response: String, emotion: String?, timing: GemmaTiming) // TEMP DEBUG: + timing
        fun onError(message: String, code: String)
    }
}
