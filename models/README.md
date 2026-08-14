# Local model files (not tracked in git)

Put a real Gemma `.task` bundle here for your own reference during
development:

```
models/
  gemma3-1b-it-int4.task
```

This directory is **not** how the model reaches the app — the app has its
own on-device import flow (⚙ → **Local Gemma** → **Import model**, which
copies a file the system document picker can reach into app-private
storage; see `android/app/src/main/java/ai/companion/pixel/gemma/`). This
`models/` directory is just a convenient, consistent place for a developer
to keep the file locally — e.g. to `adb push` it, or to have it handy when
using the phone's file picker — without it ever being a candidate for `git
add`.

`.gitignore` excludes `*.task`, `*.litertlm`, `*.bin`, `*.tflite`, and
`*.gguf` under this directory. Before committing anything under `models/`,
confirm nothing model-shaped is staged:

```bash
git status
```

The real model is never required to build, test, or develop this project —
see `CLAUDE.md`'s "Development vs. real-device vs. production" section and
`test/mockGemmaProvider.js` for the deterministic mock used instead.
