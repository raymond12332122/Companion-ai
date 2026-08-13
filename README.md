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
  model: "claude-opus-5",
  maxTokens: 320,
  temperature: 0.85,
  timeoutMs: 30000,
  historyTurns: 20,
  fallbackToLocal: true
};
```

**About the API key.** Anything in `AI_CONFIG.apiKey` ships to every visitor's
browser and is trivially readable, so the default `proxy` provider never puts a key
there. The key lives in the server's environment (`COMPANION_API_KEY`), and the
browser only ever talks to `/api/chat` on your own origin. The `anthropic` and
`openai` providers call the vendor directly from the page — convenient for local
experiments, unsafe for anything you deploy. Choosing them with a key set logs a
console warning and labels the status pill accordingly.

The proxy speaks two upstream formats, selected by `COMPANION_PROVIDER`:

| Value | Upstream | Default endpoint |
| --- | --- | --- |
| `anthropic` | Anthropic Messages API | `https://api.anthropic.com/v1/messages` |
| `openai` | any OpenAI-compatible chat API | `https://api.openai.com/v1/chat/completions` |

Point `COMPANION_API_URL` somewhere else for a gateway or self-hosted model.

### Backend endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | `{ configured, provider, model }` — the page uses this to pick its mode |
| `POST /api/chat` | `{ system, messages, model, maxTokens, temperature }` → `{ reply }` |
| `GET /*` | static files from the repository root |

The proxy caps request bodies, clamps `maxTokens`, blocks path traversal, and never
echoes upstream payloads or the key back to the browser.

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
