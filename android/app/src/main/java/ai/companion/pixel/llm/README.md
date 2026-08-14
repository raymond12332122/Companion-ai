# CompanionLocalLlm plugin

Runs the character on the phone. No network, no API key, no NVIDIA account —
the same `index.html`, the same character, the same memories, with inference
happening on the device instead of in a data centre.

The engine is [LiteRT-LM][litert], reaching Android as MediaPipe's LLM
Inference task (`com.google.mediapipe:tasks-genai`). It is real and it works.
**What is missing is a model**, and that is on purpose — see below.

[litert]: https://github.com/google-ai-edge/LiteRT-LM

## Getting a model onto the device

Nothing is bundled in the APK and nothing is downloaded automatically. A
model is 0.5-3 GB: too large to ship inside an app, and not something to pull
over someone's mobile data without asking. So it is a file you put there.

Download a **MediaPipe bundle** — a `.task` or `.litertlm` file — and push it
to the app's own directory:

```bash
adb push gemma3-1b-it-int4.task \
  /sdcard/Android/data/ai.companion.pixel/files/models/
```

That path needs no storage permission and no root; a file manager works just
as well. The app finds anything dropped there on next launch. `filesDir/models`
is checked too, for builds that want the model unreachable from outside.

### Where to get one

[`litert-community` on Hugging Face][hf] publishes conversions of most small
open models. Verified starting points:

| Model | File | Size | Notes |
| --- | --- | --- | --- |
| **Gemma 3 1B IT** | `gemma3-1b-it-int4.task` | **529 MB** | **Start here.** Fast on almost anything, small enough to not think about. |
| Gemma 3 1B IT | `gemma3-1b-it-int4.litertlm` | 557 MB | Same model, newer container format. |
| Qwen 3 1.7B | `Qwen3_1.7B.litertlm` | ~1 GB | Better prose, noticeably slower. |
| Gemma 4 E2B IT | `gemma-4-E2B-it.litertlm` | ~3 GB | Only worth it on 8 GB+ phones. |

[hf]: https://huggingface.co/litert-community

**GGUF does not work here.** This runtime reads its own bundle formats, and
`ModelCatalog` deliberately refuses to list `.gguf` so that a wrong download
fails as "no model found" at startup rather than as a native crash later. A
llama.cpp engine would read GGUF, and that is still the fallback plan in
`/LOCAL_AI_INVESTIGATION.md` if bundle availability ever becomes the
constraint.

## Turning it on

Set the provider in `index.html`:

```js
const AI_CONFIG = { provider: "device", … };
```

On launch the app looks for a model, starts loading it in the background, and
shows what it found in the status pill. With no model it says so — naming the
directory to put one in — and runs on the offline brain, exactly as it does
for a cloud provider with no key.

## How it fits together

```
index.html  callProvider("device")  ──generate({system, messages})──┐
                                                                    │
CompanionLocalLlmPlugin  ── Capacitor bridge, JSON in/out ──────────┤
                                                                    │
MediaPipeLlmEngine       ── owns the native handle, one worker ─────┤
  ├── ModelCatalog       ── finds model files on disk                │
  ├── ChatTemplate       ── formats turns for the model's family     │
  └── StructuredReply    ── pulls {response, emotion} back out ──────┘
```

The plugin speaks the same contract as `server/proxy.js`'s `/api/chat`:
`{system, messages}` in, `{response, emotion}` out. The character's identity,
personality, mood, relationship state and memories are already composed into
one `system` string by `systemPrompt()` in `index.html`, and nothing in this
package knows what is inside it. That is why switching between cloud and
device changes no other file.

### The parts that are less obvious than they look

**Chat templates matter more than they seem.** The inference API has no notion
of roles — it takes text and continues it. Every instruction-tuned model was
fine-tuned on one specific arrangement of turn markers, and the wrong one
costs real quality: the model stops recognising where its turn ends and starts
writing the user's next line. `ChatTemplate` picks the arrangement from the
filename, and `plain` is there for bundles that apply their own template
internally, where adding markers would double them.

**Small models are unreliable about JSON.** The cloud path can demand a JSON
object through a provider flag; this runtime has no such switch. A 1B model
asked for `{"response", "emotion"}` will usually comply and will sometimes
wrap it in a code fence, prefix it with "Sure!", or just answer in prose.
`StructuredReply` handles all four, and falls back to treating the whole
output as the reply — losing a good sentence for having no braces around it
would be worse than the offline-brain answer that replaced it.

**Loading is tried three ways.** GPU, then CPU, then CPU with a smaller
context window. Whether a phone's driver can run a given model, and whether a
bundle accepts the context size asked for, are both only discoverable by
trying: they fail inside native graph construction. A slow reply beats none.
Bundles that publish their KV cache size in the filename (`…_ekv1280.task`)
have it read off and respected rather than being asked for more than they hold.

**One thread owns the model for its whole life.** `LlmInference` is not safe to
generate on concurrently, loading blocks for seconds and generation for far
longer, so everything that touches the model is serialised onto a single
worker and answers through a callback. `cancel()` is the deliberate exception
— it is called from another thread precisely because the worker is busy.

## APK size

`tasks-genai` ships ~26 MB of native code per ABI. The build keeps
`arm64-v8a` and `x86_64` (every 64-bit phone, plus the standard emulator) and
drops the 32-bit ABIs, which could not hold one of these models in memory
anyway. The debug APK is ~62 MB, up from ~4 MB.

To get that back for a cloud-only build: swap `MediaPipeLlmEngine()` for
`StubLlmEngine()` in `CompanionLocalLlmPlugin`'s `engine` field and remove the
`tasks-genai` dependency from `app/build.gradle`. Nothing else changes — the
JS side already treats an unavailable device provider as a normal state.

## Tests

`app/src/test/java/…/llm/` covers the parts that are pure logic and easy to
get subtly wrong: template formatting per family, stop-marker trimming, the
JSON extraction including its streaming-partial path, and the context-window
hint. Run with `./gradlew :app:testDebugUnitTest`.

The engine itself is not unit-tested — it is a thin wrapper over a native
handle, and testing it means running a real model on a real device.
