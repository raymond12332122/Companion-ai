package ai.companion.pixel.llm

import android.content.Context
import android.util.Log
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import com.google.mediapipe.tasks.genai.llminference.LlmInferenceSession
import com.google.mediapipe.tasks.genai.llminference.ProgressListener
import java.io.File
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * On-device inference through MediaPipe's LLM Inference API — the LiteRT-LM
 * runtime, packaged for Android, with GPU acceleration and streaming.
 *
 * Nothing about the companion above this class changes because of it. The
 * character's identity, personality, mood, relationship state and memories are
 * already composed into one `system` string by `systemPrompt()` in index.html;
 * this engine receives that string, formats it for whichever model is on the
 * device, and returns the same `{response, emotion}` pair a cloud completion
 * would have carried.
 *
 * ## No model is bundled
 *
 * See [ModelCatalog]. The engine reports itself unavailable until a model file
 * appears on the device, and the JS side treats that exactly like a cloud
 * provider with no API key — it says so and runs on the offline brain.
 *
 * ## Threading
 *
 * One worker thread owns the native handle for its whole life. MediaPipe's
 * `LlmInference` is not safe to generate on concurrently, loading blocks for
 * seconds, and generation blocks for far longer, so every call that touches
 * the model is serialised onto that thread and answers through a callback.
 * [cancel] is the one exception, called from whatever thread wants generation
 * to stop — it has to be, since the thread it is stopping is busy.
 */
class MediaPipeLlmEngine : LlmEngine {

    private companion object {
        const val TAG = "CompanionLlm"

        /**
         * Total token budget — prompt *and* reply, which is what this API's
         * `setMaxTokens` means. The character's system prompt is substantial
         * (identity, personality, relationship, memories) and `historyTurns`
         * adds up to 20 messages behind it, so a 1024 window would start
         * silently truncating the character's own definition on a long
         * conversation. 2048 leaves room for that plus a full reply, at a KV
         * cache small enough for a 4 GB phone.
         */
        const val CONTEXT_TOKENS = 2048

        /** Last-ditch window, tried when the requested one is refused. */
        const val MIN_CONTEXT_TOKENS = 1024

        /** Ceiling for a session's topK; a session may not ask for more. */
        const val MAX_TOP_K = 64
        const val SESSION_TOP_K = 40
        const val SESSION_TOP_P = 0.95f

        /**
         * Conversion bundles are built with a fixed KV cache size and publish
         * it in the filename — `…_q4_ekv1280.task` holds 1280 tokens and not
         * one more. Asking for a larger window than the file was built for is
         * refused during graph construction, with a native error message that
         * says nothing about the number being the problem, so the hint gets
         * read here while it is still legible.
         */
        val EKV_HINT = Regex("""ekv(\d+)""", RegexOption.IGNORE_CASE)
    }

    private val worker = Executors.newSingleThreadExecutor { runnable ->
        Thread(runnable, "companion-llm").apply { isDaemon = true }
    }

    @Volatile private var inference: LlmInference? = null
    @Volatile private var session: LlmInferenceSession? = null
    @Volatile private var loadedModel: ModelCandidate? = null
    @Volatile private var loadedFamily: ChatTemplate.Family = ChatTemplate.Family.PLAIN
    @Volatile private var loadedBackend: String? = null
    @Volatile private var forcedTemplate: String? = null

    private val generating = AtomicBoolean(false)

    override fun availability(context: Context): AvailabilityStatus {
        val loaded = loadedModel
        if (loaded != null && inference != null) {
            return AvailabilityStatus(
                available = true,
                loaded = true,
                reason = null,
                modelId = loaded.id,
                modelPath = loaded.path,
                sizeBytes = loaded.sizeBytes,
                backend = loadedBackend
            )
        }

        val candidate = ModelCatalog.best(context)
            ?: return AvailabilityStatus(
                available = false,
                loaded = false,
                reason = "no_model_found:" + ModelCatalog.preferredDropDir(context)
            )

        return AvailabilityStatus(
            available = true,
            loaded = false,
            reason = "not_loaded",
            modelId = candidate.id,
            modelPath = candidate.path,
            sizeBytes = candidate.sizeBytes
        )
    }

    override fun listModels(context: Context): List<ModelCandidate> = ModelCatalog.list(context)

    override fun load(
        context: Context,
        modelPath: String?,
        template: String?,
        callback: (LoadOutcome) -> Unit
    ) {
        val app = context.applicationContext
        worker.execute {
            try {
                callback(loadBlocking(app, modelPath, template))
            } catch (t: Throwable) {
                Log.e(TAG, "Model load failed", t)
                callback(LoadOutcome(false, null, describe(t), null, 0L))
            }
        }
    }

    /** Runs on [worker]. */
    private fun loadBlocking(context: Context, modelPath: String?, template: String?): LoadOutcome {
        val candidate = resolve(context, modelPath)
            ?: return LoadOutcome(
                loaded = false,
                modelId = null,
                error = "No model file found. Put a MediaPipe .task or .litertlm " +
                    "bundle in " + ModelCatalog.preferredDropDir(context) + " and try again.",
                backend = null
            )

        val already = loadedModel
        if (already != null && already.path == candidate.path && inference != null &&
            (template == null || template == forcedTemplate)
        ) {
            return LoadOutcome(true, already.id, null, loadedBackend, 0L)
        }

        releaseBlocking()

        val started = System.currentTimeMillis()
        val budget = tokenBudgetFor(candidate.id)

        // GPU first, CPU next, then a smaller window. Whether a given phone's
        // driver can run this model — and whether the bundle will accept the
        // window asked for — is not knowable ahead of time: both failures
        // surface from native code during graph construction. A slow reply, or
        // a shorter-memoried one, beats no reply at all.
        val attempts = linkedSetOf(
            LlmInference.Backend.GPU to budget,
            LlmInference.Backend.CPU to budget,
            LlmInference.Backend.CPU to minOf(MIN_CONTEXT_TOKENS, budget)
        )

        var lastFailure: Throwable? = null
        for ((backend, tokens) in attempts) {
            try {
                val built = create(context, candidate.path, backend, tokens)
                inference = built
                loadedModel = candidate
                loadedBackend = backend.name.lowercase()
                forcedTemplate = template
                loadedFamily = ChatTemplate.Family.byId(template) ?: ChatTemplate.familyFor(candidate.id)

                val elapsed = System.currentTimeMillis() - started
                Log.i(
                    TAG,
                    "Loaded ${candidate.id} on $backend, $tokens tokens, in ${elapsed}ms " +
                        "(template=${loadedFamily.id})"
                )
                return LoadOutcome(true, candidate.id, null, loadedBackend, elapsed)
            } catch (t: Throwable) {
                lastFailure = t
                Log.w(TAG, "Load attempt failed for ${candidate.id} ($backend, $tokens tokens)", t)
            }
        }

        return LoadOutcome(
            loaded = false,
            modelId = candidate.id,
            error = lastFailure?.let { describe(it) } ?: "Model failed to load",
            backend = null
        )
    }

    /** Never rounded up: the hint is a hard ceiling the bundle was built with. */
    internal fun tokenBudgetFor(fileName: String): Int {
        val hinted = EKV_HINT.find(fileName)?.groupValues?.get(1)?.toIntOrNull() ?: return CONTEXT_TOKENS
        return minOf(CONTEXT_TOKENS, hinted)
    }

    private fun create(
        context: Context,
        path: String,
        backend: LlmInference.Backend,
        maxTokens: Int
    ): LlmInference {
        val options = LlmInference.LlmInferenceOptions.builder()
            .setModelPath(path)
            .setMaxTokens(maxTokens)
            .setMaxTopK(MAX_TOP_K)
            .setPreferredBackend(backend)
            .build()
        return LlmInference.createFromOptions(context, options)
    }

    private fun resolve(context: Context, modelPath: String?): ModelCandidate? {
        if (modelPath.isNullOrBlank()) return ModelCatalog.best(context)
        val file = File(modelPath)
        if (!file.isFile) return null
        return ModelCatalog.list(context).firstOrNull { it.path == file.absolutePath }
            ?: ModelCandidate(
                id = file.name,
                path = file.absolutePath,
                sizeBytes = file.length(),
                family = ChatTemplate.familyFor(file.name).id
            )
    }

    override fun generate(context: Context, request: GenerateRequest, callback: LlmEngine.Callback) {
        val app = context.applicationContext
        if (!generating.compareAndSet(false, true)) {
            // Queueing instead would be worse: the second caller waits out the
            // first one's entire generation before its own starts, and blows
            // its timeout having done nothing.
            callback.onError("A reply is already being generated", "busy")
            return
        }

        worker.execute {
            try {
                if (inference == null) {
                    // Lazy load, so a first message still works when startup's
                    // proactive load never ran or has not finished.
                    val outcome = loadBlocking(app, null, forcedTemplate)
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
    private fun generateBlocking(request: GenerateRequest, callback: LlmEngine.Callback) {
        val engine = inference ?: run {
            callback.onError("No model is loaded", "not_loaded")
            return
        }

        val family = loadedFamily
        val prompt = ChatTemplate.format(family, request.system, request.messages)

        val sessionOptions = LlmInferenceSession.LlmInferenceSessionOptions.builder()
            .setTopK(SESSION_TOP_K)
            .setTopP(SESSION_TOP_P)
            .setTemperature(request.temperature.coerceIn(0.05f, 2.0f))
            .setRandomSeed(System.nanoTime().toInt())
            .build()

        // A fresh session per turn, closed at the end. The full history is
        // already in `prompt`, so reusing one would send every turn twice —
        // once in the session's own accumulated context and once in the text —
        // and grow until it overran the token window.
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
            // The listener receives deltas and the future resolves with the
            // whole reply; taking whichever is longer keeps this correct if a
            // future version of the runtime changes which is which.
            val raw = if (returned.length >= assembled.length) returned else assembled.toString()

            val trimmed = ChatTemplate.trimAtStop(raw, family)
            val parsed = StructuredReply.extract(trimmed)
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

    override fun cancel() {
        val active = session ?: return
        try {
            active.cancelGenerateResponseAsync()
        } catch (t: Throwable) {
            Log.w(TAG, "Cancel failed", t)
        }
    }

    override fun unload() {
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
        loadedModel = null
        loadedBackend = null
    }

    /**
     * Native failures arrive as a bare class name with no message often enough
     * that the raw text is useless on its own.
     */
    private fun describe(t: Throwable): String {
        val cause = generateSequence(t) { it.cause }.last()
        val message = cause.message?.takeIf { it.isNotBlank() } ?: cause::class.java.simpleName
        return message.lineSequence().first().take(300)
    }
}
