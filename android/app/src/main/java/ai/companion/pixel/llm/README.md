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
over someone's mobile data without asking. So it is a file you supply.

Download a **MediaPipe bundle** — a `.task` or `.litertlm` file — anywhere on
the phone, then:

> ⚙ → **Local AI** → **Import model**

The system document picker opens, reaches Downloads or an SD card or Drive,
and [`ModelImporter`](ModelImporter.kt) copies the chosen file into
`filesDir/models`. No storage permission is involved — not
`MANAGE_EXTERNAL_STORAGE`, not `READ_EXTERNAL_STORAGE` — no root, no computer.

With a machine attached, `adb` skips the copy by writing straight into the
other directory that gets scanned:

```bash
adb push gemma3-1b-it-int4.task \
  /sdcard/Android/data/ai.companion.pixel/files/models/
```

Both locations are searched on every launch, so neither route is privileged.

### Why the import copies rather than referencing

`LlmInference` opens a model by filesystem path and memory-maps it in native
code; it cannot be handed a `content://` URI. Half a gigabyte therefore has to
move, which is why the import reports progress, can be cancelled, checks free
space first, and writes to `<name>.part` until the last byte lands.

The check that matters most happens *before* any of that. The first 64 bytes
are read off the stream and matched against the real signatures
([`ModelValidator`](ModelValidator.kt)): `LITERTLM` at offset 0, a zip header
within the first 16 bytes for `.task` (the published bundles carry four zero
bytes before `PK\x03\x04`), `TFL3` at offset 4 for a bare flatbuffer. GGUF is
recognised specifically so the refusal can say *"that's a llama.cpp model"*
instead of failing four minutes and 500 MB later inside native graph
construction, where the error names neither the file nor the reason.

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

**GGUF does not work here.** This runtime reads its own bundle formats.
`ModelCatalog` refuses to list `.gguf`, and the importer refuses to copy one —
by content, so renaming it to `.task` does not get it through. A llama.cpp
engine would read GGUF, and that is still the fallback plan in
`/LOCAL_AI_INVESTIGATION.md` if bundle availability ever becomes the
constraint.

## Turning it on

Set the provider in `index.html`:

```js
const AI_CONFIG = { provider: "device", … };
```

On launch the app looks for a model, starts loading it in the background, and
shows what it found in the status pill. With no model it says so — pointing at
⚙ → Local AI, which is the one place that can fix it — and runs on the offline
brain, exactly as it does for a cloud provider with no key.

The Local AI panel stays useful after that: it names the loaded model and its
backend, replaces it, and deletes it. Deleting is restricted to files the app
itself wrote, so a bug upstream cannot turn `removeModel` into a general
delete. With two models present, whichever was chosen last wins over the
catalog's "largest file" guess, and that choice survives a restart
([`ModelStore`](ModelStore.kt)).

## How it fits together

```
index.html  callProvider("device")  ──generate({system, messages})──┐
            LocalAiUI               ──importModel() / removeModel()─┤
                                                                    │
CompanionLocalLlmPlugin  ── Capacitor bridge, JSON in/out ──────────┤
                                                                    │
MediaPipeLlmEngine       ── owns the native handle, one worker ─────┤
  ├── ModelCatalog       ── finds model files on disk                │
  ├── ModelImporter      ── document picker → app storage            │
  │   └── ModelValidator ── is this actually a model?                │
  ├── ModelStore         ── remembers which one was chosen           │
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
JSON extraction including its streaming-partial path, the context-window hint,
and the import's format sniffing and refusal messages. 45 tests; run with
`./gradlew :app:testDebugUnitTest`.

The engine itself is not unit-tested — it is a thin wrapper over a native
handle, and testing it means running a real model on a real device. Neither is
the copy loop in `ModelImporter`, which needs a `ContentResolver`; what it
delegates to (`ModelValidator`) is tested instead, since that is where the
decisions are.
