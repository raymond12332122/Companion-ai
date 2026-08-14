package ai.companion.pixel.llm

import android.content.Context

/**
 * An engine that is never available.
 *
 * [MediaPipeLlmEngine] is what the plugin uses; this is kept for the build
 * that wants the plugin present and inference definitively off — swap it into
 * [CompanionLocalLlmPlugin]'s `engine` field and the MediaPipe dependency can
 * come out of `app/build.gradle` with nothing else to change. That is worth
 * roughly 55 MB of native libraries for an APK that will only ever talk to the
 * cloud, and it is also the shape any future engine has to fit.
 *
 * The JS side treats an unavailable device provider as a normal, expected
 * state — the same path as a cloud provider with no key — so this degrades to
 * the offline brain rather than to an error.
 */
class StubLlmEngine : LlmEngine {

    override fun availability(context: Context) = AvailabilityStatus(
        available = false,
        loaded = false,
        reason = "engine_disabled"
    )

    override fun listModels(context: Context): List<ModelCandidate> = emptyList()

    override fun load(
        context: Context,
        modelPath: String?,
        template: String?,
        callback: (LoadOutcome) -> Unit
    ) {
        callback(
            LoadOutcome(
                loaded = false,
                modelId = null,
                error = "On-device inference is disabled in this build."
            )
        )
    }

    override fun unload() {
        // Nothing was ever loaded.
    }

    override fun cancel() {
        // Nothing is ever running.
    }

    override fun generate(context: Context, request: GenerateRequest, callback: LlmEngine.Callback) {
        callback.onError("On-device inference is disabled in this build.", "engine_disabled")
    }
}
