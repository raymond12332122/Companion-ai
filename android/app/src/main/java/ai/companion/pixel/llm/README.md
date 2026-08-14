# CompanionLocalLlm plugin

Bridges the companion's provider abstraction to an on-device model, so the
same character can run offline without a data connection or an NVIDIA key.

**Status: scaffolding only.** `StubLlmEngine` is the only implementation, and
it always reports itself unavailable. No model is bundled, no inference
engine dependency is pulled in, and no native inference runs. What exists
here is the wiring everything else plugs into once a model is chosen — see
`/LOCAL_AI_INVESTIGATION.md` and `/70B_TESTING_RESULTS.md` at the repo root
for the research and reasoning behind the recommendation below.

## Why this shape

`CompanionLocalLlmPlugin` speaks the same two-field contract as
`server/proxy.js`'s `/api/chat`: `{system, messages}` in,
`{response, emotion}` out. The character identity, personality, mood,
relationship state, and memories are already composed into a single
`system` string by `systemPrompt()` in `index.html` — this plugin receives
that string as-is and never needs to know what's inside it. Swapping engines
is a one-file change (`LlmEngine`'s implementation); nothing upstream moves.

## Wiring in a real engine

1. **Pick the engine.** Recommendation from `/LOCAL_AI_INVESTIGATION.md`:
   - Primary: **LiteRT-LM** (`com.google.ai.edge.litert` / MediaPipe GenAI
     tasks) — GPU-accelerated, cleaner Kotlin API.
   - Fallback: **llama.cpp** via JNI, if GGUF model flexibility turns out to
     matter more than the smoother LiteRT integration.

2. **Pick the model.** Recommendation: **Llama 3.2 3B Instruct, Q4_K_M
   GGUF/LiteRT-converted (~2.0 GB)**, with **Gemma 2 2B (~1.4 GB,
   Apache-2.0)** as a smaller-footprint fallback for tighter storage/RAM
   budgets. Neither is bundled yet — that's a separate, explicit decision
   (storage cost, download-on-demand vs. bundled-in-APK, licensing
   acknowledgment) that hasn't been made.

3. **Add the dependency** in `android/app/build.gradle` (commented placeholder
   already there) once the exact Maven coordinates and version are verified
   against the current LiteRT-LM release.

4. **Implement `LlmEngine`** (new class, e.g. `LiteRtLlmEngine.kt`) — reads
   `GenerateRequest.system` + `.messages`, runs the engine's chat template,
   and calls `Callback.onToken` per token if the engine streams, then
   `Callback.onComplete(response, emotion)` once. The character's prompt
   already asks for a `{"response": "...", "emotion": "..."}` JSON object
   (see `personaPrompt()` in `index.html`) — the same
   `extractStructuredReply()` parsing the cloud path uses can run here too,
   so emotion extraction doesn't need reinventing.

5. **Swap `StubLlmEngine()` for the real engine** in
   `CompanionLocalLlmPlugin`'s single `engine` field. That's the entire
   integration point — the plugin's method bodies, the JS-side `"device"`
   provider in `index.html`, and the fallback chain (device → proxy →
   offline brain) all stay as they are.

## What deliberately isn't here yet

- No model file, anywhere in the repo or the APK.
- No inference engine dependency actually resolved/downloaded.
- No GPU/NPU delegate selection logic.
- No on-device download-and-verify flow for fetching a model post-install.

Each is a real decision (storage, licensing, UX for a multi-GB download) that
belongs in its own change, not bundled into scaffolding.
