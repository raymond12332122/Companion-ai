# Companion Workspace — Pixel

A small single-page web app with an AI companion built into it. Pixel lives in a
panel beside the workspace content, talks casually, remembers what you tell it for
the session, and changes its face depending on how the conversation is going.

```
index.html              the whole app — markup, styles, and companion logic
assets/sprites/*.svg    six expressions: neutral, happy, sad, surprised, angry, thinking
server/proxy.js         zero-dependency Node backend: serves the app + proxies AI calls
.env.example            the environment variables the proxy reads
```

## Running it

**With an AI provider (recommended):**

```bash
cp .env.example .env          # fill in COMPANION_API_KEY
set -a; . ./.env; set +a
node server/proxy.js          # http://localhost:8080
```

**Without a key** — open `index.html` directly, or run the proxy with no key set.
Pixel falls back to a small built-in offline brain so the page stays usable: it
still greets you, remembers facts, answers recall questions, and runs commands.
The status pill in the header always tells you which mode you're in.

## Configuring the AI

There is one configuration block, near the top of the script in `index.html`:

```js
const AI_CONFIG = {
  provider: "proxy",       // "proxy" | "anthropic" | "openai" | "local"
  apiUrl: "/api/chat",
  apiKey: "",              // keep empty — see below
  model: "",               // blank: the proxy's COMPANION_MODEL wins
  maxTokens: 320,
  temperature: 0.9,
  presencePenalty: 0.4,
  frequencyPenalty: 0.35,
  jsonMode: true,          // ask for a {response, emotion} object
  timeoutMs: 30000,
  historyTurns: 20,
  fallbackToLocal: true
};
```

`model` is deliberately blank. With the `proxy` provider the server owns the model
name, because the server is the side that knows which models its configured
endpoint actually serves. Setting a name here overrides that and is only useful
for the direct `anthropic` / `openai` providers.

**About the API key.** Anything in `AI_CONFIG.apiKey` ships to every visitor's
browser and is trivially readable, so the default `proxy` provider never puts a key
there. The key lives in the server's environment (`COMPANION_API_KEY`), and the
browser only ever talks to `/api/chat` on your own origin. The `anthropic` and
`openai` providers call the vendor directly from the page — convenient for local
experiments, unsafe for anything you deploy. Choosing them with a key set logs a
console warning and labels the status pill accordingly.

### Providers

The proxy holds a registry of providers, selected by `COMPANION_PROVIDER`. The
companion itself never names a vendor — it posts to `/api/chat` and the registry
decides who answers.

| `COMPANION_PROVIDER` | Upstream | Status | Default endpoint |
| --- | --- | --- | --- |
| `nvidia` | NVIDIA NIM (OpenAI-compatible) | **implemented, default** | `https://integrate.api.nvidia.com/v1/chat/completions` |
| `openai` | any OpenAI-compatible chat API | implemented | `https://api.openai.com/v1/chat/completions` |
| `anthropic` | Anthropic Messages API | implemented | `https://api.anthropic.com/v1/messages` |
| `gemini` | Google Gemini | reserved, not implemented | — |
| `local` | on-device model | reserved, not implemented | — |

Every implemented provider requires both `COMPANION_API_KEY` and `COMPANION_MODEL`.
No model name is defaulted: a guessed name is a name the configured endpoint has
never heard of, and the resulting 404 looks like a network fault. When something is
missing, `GET /api/health` names the exact variables to set and the app says so in
the chat rather than failing silently.

`COMPANION_API_URL` overrides the endpoint for a gateway or self-hosted model.

Adding a vendor that speaks an existing wire format is a registry entry and no new
code; `gemini` is listed separately because its request shape is neither of the two
wires and needs its own adapter.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `COMPANION_PROVIDER` | no (defaults to `nvidia`) | which registry entry to use |
| `COMPANION_API_KEY` | **yes** | credential; read only from the environment, never sent to the browser |
| `COMPANION_MODEL` | **yes** | model id, e.g. `meta/llama-3.1-8b-instruct` |
| `COMPANION_API_URL` | no | override the provider's default endpoint |
| `COMPANION_MAX_TOKENS` | no (400) | upper bound on reply length |
| `PORT` | no (8080) | listen port |

For NVIDIA, create a key at [build.nvidia.com](https://build.nvidia.com) and pick a
model id from its catalogue.

### Backend endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | `{ ready, provider, model, reason, missingEnv, providers }` — the page uses this to pick its mode and to report missing configuration |
| `POST /api/chat` | `{ system, messages, maxTokens, temperature, jsonMode, … }` → `{ reply }` |
| `GET /*` | static files from the repository root |

The proxy caps request bodies, clamps `maxTokens`, blocks path traversal, and never
echoes upstream payloads or the key back to the browser. Every string that reaches
a log line or a response body passes through a redaction step that removes the
configured key and anything shaped like a credential.

### Reply format

The model is asked for a single JSON object:

```json
{"response": "what the character says", "emotion": "annoyed"}
```

`emotion` must be one of the expressions the sprite system already knows about
(the ten base expressions plus any the character's author added), and it selects
the sprite on the stage. Replies that arrive as plain prose — or with the older
`[[mood:x]]` tag — are still parsed, and an unrecognised emotion is dropped rather
than shown.

## Reacting to what's happening

Beyond replying to messages, the companion notices a few things about its
surroundings. Sources observe one thing each and hand a normalised event to the
event manager; the manager deduplicates, applies the user's settings and
per-type cooldowns; a policy layer decides whether the event is worth nothing,
an expression change, a locally written line, or — rarely — a model-written
reaction.

| Event | Priority | What it may do |
| --- | --- | --- |
| `APP_OPENED` | notable | greets a returning user, locally |
| `APP_BACKGROUNDED` | trivial | nothing |
| `USER_RETURNED` | contextual | remarks locally; **only** path that may reach the API |
| `USER_IDLE` | notable | one local nudge, at most every 30 min |
| `USER_INTERACTION` | trivial | resets the idle timer, nothing else |
| `CHARGING_STARTED` / `CHARGING_STOPPED` | ambient | expression only, silent |
| `BATTERY_LOW` | notable | one local remark per hour |
| `TIME_PERIOD_CHANGED` | ambient | expression drifts with the hour, silent |
| `DAY_NIGHT_CHANGED` | notable | one local remark |

Reactions default to on; **AI-written reactions default to off**. When enabled,
only a return after 45+ minutes with a conversation worth resuming may spend a
call, capped at four per session. Everything else is composed locally from the
character's own personality, mood and relationship, and costs nothing.

The rules that keep it from becoming noise: nothing is said while the user is
typing, while a reply is in flight, while the tab is hidden, within 90 seconds
of the last unprompted line, or twice in a row without the user saying something
in between. Ambient expression drift also yields to a mood the character is
still strongly holding.

Per-event toggles live in the ⚙ panel on the character stage.

### What needs a native Android shell

Everything above runs in the browser today. `visibilitychange` covers opening,
backgrounding and returning; timers cover idle and the clock; the Battery Status
API covers charge state and level without any permission prompt (Chrome on
Android; absent on iOS and Firefox, where those reactions simply stay quiet).

A PWA gets no execution time while backgrounded, so `BATTERY_LOW` and
`TIME_PERIOD_CHANGED` are observed on return rather than at the moment they
happen. Genuine background triggering needs a native shell (Capacitor plus a
foreground service). Adding one means writing a source that calls
`EventManager.emit()` with the same event names — no other layer changes.

Deliberately out of scope: notifications, contacts, SMS, call logs, microphone,
and location. None of them are read, requested, or referenced anywhere.

## Memory

Conversation and extracted facts are stored in `localStorage` under
`companion.pixel.v1`, so a refresh keeps the session. Facts are pulled out of your
messages with a small set of patterns (`I hate …`, `my name is …`, `I'm working on
…`, `I live in …`, and friends) and injected into the system prompt, which is what
makes recall work:

> **You:** I hate pineapple pizza.
> **You:** What food did I say I hated?
> **Pixel:** Pineapple pizza.

**Clear memory** in the panel header (or `/clear`) erases the history, the facts,
and the stored blob. If `localStorage` is unavailable — private mode, blocked
storage — the app keeps working in memory and says so instead of throwing.

## Commands

| Command | Does |
| --- | --- |
| `/help` | what Pixel can do, and the command list |
| `/memory` | everything currently stored: session start, message count, storage location, facts |
| `/clear` | wipes the conversation and memory, then starts fresh |

## Expressions

The model ends each reply with a `[[mood:…]]` tag, which is stripped from the
displayed text and used to swap the sprite. If the tag is missing (or Pixel is
running offline), a keyword heuristic picks the expression instead.

Sprites are real files under `assets/sprites/`, referenced with relative paths. The
`<img>` starts hidden with a drawn fallback face visible underneath, and only swaps
in once the image actually decodes — so a missing, misnamed, or blocked sprite shows
a face rather than an empty rectangle or a broken-image icon. A path that fails once
is remembered and not retried.

## Error handling

Failures surface as a message from Pixel rather than a broken page: request
timeouts (30s, via `AbortController`), network errors, auth rejections, upstream
errors, unparseable bodies, and empty replies each get their own friendly line. With
`fallbackToLocal: true` the offline brain answers instead and the status pill turns
red; with it off you get an error bubble and a **Try again** button that re-sends the
original message.

## What Pixel is

An AI character with a fixed persona: friendly, a bit sarcastic, curious, and
willing to tell you you're wrong instead of agreeing by default. It does not claim to
be human, and says so if you ask.
