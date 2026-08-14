# Prebuilt APK

`companion-ai-debug.apk` — 60 MB, debug-signed, universal (`arm64-v8a` +
`x86_64`).

This is here so the app can be installed on a phone with no computer in the
loop: download it from GitHub in the phone's browser and open it. There is no
`adb` step.

```
https://github.com/raymond12332122/Companion-ai/raw/refs/heads/claude/ai-companion-buddy-jvj4bq/dist/companion-ai-debug.apk
```

SHA-256: `8ab853a41fbb9f01a490352e235510f7a42b70d76f7046eb054c84fe543fefc1`

Android will ask permission to install from whatever app opened the file
(Chrome, or the file manager) — that prompt is expected for anything not from
the Play Store.

## Why universal, not arm64-only

An arm64-only build is possible (`abiFilters 'arm64-v8a'` in
`android/app/build.gradle`) and halves the download, but producing one by
manually stripping `x86_64` out of the universal APK requires `zipalign` and
`apksigner` to re-seal the archive correctly — without them, a plain
unzip/re-zip breaks the APK Signing Block and the result fails to install.
Those tools aren't available in every build environment this project gets
built from, so this APK is shipped exactly as `assembleDebug` produces it:
unmodified, and therefore guaranteed to install.

## Then what

The APK contains no model. Two independent on-device engines are built in:

- **Local AI** (`android/.../llm/`) — the original `CompanionLocalLlm`
  Capacitor plugin.
- **Local Gemma** (`android/.../gemma/`) — a separate, self-contained
  `CompanionGemma` Capacitor plugin, its own model slot, built after Local
  AI's plugin registration couldn't be confirmed reaching the WebView on a
  real device. It runs the same MediaPipe/LiteRT-LM runtime independently.

Download a `.task` bundle anywhere on the phone, then in the app:

> ⚙ (on the character's stage) → **Local Gemma** → **Import model**

That opens the system file picker and copies the file into app storage. No
permission, no root, no cable. Start with `gemma3-1b-it-int4.task` (529 MB)
from [litert-community](https://huggingface.co/litert-community). With no
model the app says so in the status pill and runs on the offline brain.

Whichever engine actually answers depends on `AI_CONFIG.provider` in
`index.html` — this build has it set to `"gemma"`, so the app runs on Local
Gemma once a model is imported (`"device"` selects the original Local AI
plugin instead, `"proxy"` the cloud backend).

## Housekeeping

A 60 MB binary in git is not where a release artifact belongs long-term. It is
committed because it is currently the only way to get the file onto the phone
that built it. Once there is a release flow, delete this directory.
