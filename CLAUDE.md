# CLAUDE.md

Guidance for Claude Code working in this repository: a Capacitor Android app
with a companion character (single-file `index.html` frontend, native Kotlin
plugins for on-device LLM inference via MediaPipe/LiteRT-LM).

## Three-agent development system

This repo uses three subagents with distinct roles, defined in
`.claude/agents/`:

- **`haiku-qa`** (`.claude/agents/haiku-qa.md`) — aggressive QA/inspector.
  Verifies real user flow, not source-level assumptions. Never makes large
  architectural changes.
- **`sonnet-builder`** (`.claude/agents/sonnet-builder.md`) — primary
  implementation agent. Normal coding, refactoring, UI, tests, wiring,
  documentation, straightforward debugging.
- **`opus-engineer`** (`.claude/agents/opus-engineer.md`) — senior
  architecture/debugging agent. Complex native Android/Capacitor/MediaPipe/
  LiteRT problems, architecture decisions, and anything sonnet-builder has
  failed at twice.

### Routing

Use **haiku-qa** for:
- Inspection, testing, regression checking
- Log analysis, user-flow verification
- Small diagnostic tasks

Use **sonnet-builder** for:
- Normal implementation, UI, refactoring, tests
- Standard debugging, project structure, documentation

Use **opus-engineer** for:
- Complex native Android problems
- Capacitor plugin registration issues
- MediaPipe/LiteRT/inference problems
- Architecture decisions
- Performance problems requiring native investigation
- Any problem sonnet-builder has failed at twice
- Any task where the root cause is unclear after reasonable investigation

### Workflow

Normal implementation:

```
sonnet-builder → implementation → haiku-qa → report
```

If QA fails:

```
sonnet-builder → fix → haiku-qa
```
(repeat as needed for distinct new issues)

If the **same underlying problem** survives two sonnet-builder attempts —
same bug remains after two distinct implementation attempts, or the same
area has been reverted/reworked twice without resolving the root cause —
**stop repeating the same strategy** and escalate:

```
opus-engineer → root-cause investigation → implementation → haiku-qa
```

Harmless test corrections or unrelated fixes made along the way don't count
toward the two-attempt escalation threshold.

### Project rule: don't widen the blast radius

Never modify unrelated working systems just to solve an isolated problem.
Before changing native Android, Capacitor, AI inference, sprites, memory,
mood, relationship, or event systems, identify the exact boundary where the
failure actually occurs.

Every agent reports:
- What it changed
- Why it changed it
- What it tested
- What passed
- What remains uncertain

## Development vs. real-device vs. production

This project has three distinct testing paths — keep them separate, and
never let one substitute for another in a report:

| Path | Source | Provider |
|---|---|---|
| Development/test | source code | `MockGemmaProvider` (deterministic, see `test/mockGemmaProvider.js`) |
| Real Android device | source code | real `gemma3-1b-it-int4.task` on-device |
| Production | source code | real configured provider |

**The mock provider never silently activates in production or when the real
model is simply unavailable.** It only activates when a test/dev flag is
explicitly set (`window.__COMPANION_MOCK_GEMMA__`, or running under the Node
test harness). If the real model fails, production reports the real failure
through the existing fallback design — it does not fall back to the mock.

A mock-based test result proves the provider-abstraction code (prompt
construction, history handling, fallback logic, UI state, provider
switching) works correctly against a well-behaved and various badly-behaved
plugin. **It does not prove the real Gemma model or the real native
inference runtime works.** Conversely, a real-device test proves the real
model and runtime; it says nothing about coverage of the failure paths and
edge cases that are easy to test deterministically only with a mock. Report
each with its own scope — never claim one proves the other.

## The real Gemma model is never in this repository

`gemma3-1b-it-int4.task` (~529 MB) is not committed, not bundled into the
APK, and not required in Claude's cloud environment. See `models/README.md`
for where a developer places it locally for real-device testing, and the
repo's `.gitignore` for the rule that keeps it untracked. Before committing
anything under `models/`, run `git status` and confirm no `.task` file is
staged.
