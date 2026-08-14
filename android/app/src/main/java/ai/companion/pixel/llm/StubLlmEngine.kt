package ai.companion.pixel.llm

import android.content.Context

/**
 * Placeholder engine — no model is bundled with the app yet, so this always
 * reports itself unavailable rather than pretending to run inference.
 *
 * This exists so the plugin, the JS-side "device" provider, and the fallback
 * chain (device -> cloud proxy -> offline rule-based brain) are all real and
 * testable today, ahead of a model being chosen and bundled. Swapping this
 * for a real engine is the only change needed later — nothing in
 * [CompanionLocalLlmPlugin] or index.html has to move.
 */
class StubLlmEngine : LlmEngine {

    override fun availability(context: Context): AvailabilityStatus {
        return AvailabilityStatus(
            available = false,
            reason = "no_model_bundled"
        )
    }

    override fun load(context: Context, modelPath: String?): LoadOutcome {
        return LoadOutcome(
            loaded = false,
            modelId = null,
            error = "No on-device model is bundled with this build yet. " +
                "See android/app/src/main/java/ai/companion/pixel/llm/README.md."
        )
    }

    override fun unload() {
        // Nothing to release — no model was ever loaded.
    }

    override fun generate(request: GenerateRequest, callback: LlmEngine.Callback) {
        callback.onError(
            "On-device inference is not implemented in this build.",
            "not_implemented"
        )
    }
}
