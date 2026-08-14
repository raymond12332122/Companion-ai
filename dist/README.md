# Prebuilt APK

`companion-ai-debug-arm64.apk` — 32 MB, debug-signed, `arm64-v8a` only.

This is here so the app can be installed on a phone with no computer in the
loop: download it from GitHub in the phone's browser and open it. There is no
`adb` step.

```
https://github.com/raymond12332122/Companion-ai/raw/refs/heads/claude/ai-companion-buddy-jvj4bq/dist/companion-ai-debug-arm64.apk
```

SHA-256: `cff3cf612b0c293563970295137263f4a3b1c22ac16b892dde96ad4d9e1526b6`

Android will ask permission to install from whatever app opened the file
(Chrome, or the file manager) — that prompt is expected for anything not from
the Play Store.

## Why arm64 only

`assembleDebug` produces a universal APK carrying native inference libraries
for both `arm64-v8a` and `x86_64`, and the `x86_64` copy is 30 MB of an
otherwise 62 MB file. Every 64-bit Android phone is arm64; `x86_64` is there
for the desktop emulator. Dropping it halves the download and changes nothing
on a real device. The build itself is unchanged — this APK is the universal
one with that one directory removed, then re-aligned and re-signed with the
standard debug key.

Build the universal APK with `npm run android:debug` if the emulator is ever
needed.

## Then what

The APK contains no model — see
`android/app/src/main/java/ai/companion/pixel/llm/README.md`. Download a
`.task` or `.litertlm` bundle anywhere on the phone, then in the app:

> ⚙ (on the character's stage) → **Local AI** → **Import model**

That opens the system file picker and copies the file into app storage. No
permission, no root, no cable. Start with `gemma3-1b-it-int4.task` (529 MB)
from [litert-community](https://huggingface.co/litert-community). With no
model the app says so in the status pill and runs on the offline brain.

## Housekeeping

A 32 MB binary in git is not where a release artifact belongs long-term. It is
committed because it is currently the only way to get the file onto the phone
that built it. Once there is a release flow, delete this directory.
