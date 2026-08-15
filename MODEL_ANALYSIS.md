# Model Comparison Analysis

**Date:** 2026-08-14  
**Test Scenarios:** 10 conversational character situations  
**Models Tested:** 
- `meta/llama-3.1-8b-instruct` (current, 8 billion parameters)
- `meta/llama-3.1-70b-instruct` (candidate upgrade, 70 billion parameters)

---

## Results Summary

### meta/llama-3.1-8b-instruct (Current)
- **Success Rate:** 10/10 (100%)
- **JSON Compliance:** 10/10 (100%)
- **Speed:** Fast and consistent
- **Reliability:** Excellent — zero timeouts

### meta/llama-3.1-70b-instruct (Candidate)
- **Success Rate:** 7/10 (70%)
- **JSON Compliance:** 7/7 (100% when successful)
- **Speed:** Slower, some timeouts
- **Reliability:** Good but experiences rate-limiting

---

## Quality Comparison

### 1. Memory Integration

**8B Response** (User mentions espresso machine achievement):
> "That's awesome! I'm super stoked for you! Dialing in an espresso machine can be a real challenge, but it sounds like all your hard work paid off. What's your go-to roast for this machine?"

**70B Response** (Same scenario):
> "That's amazing, I'm so stoked for you! I remember you just got the machine last week and now you've already mastered the tamping - that's dedication! How does the espresso taste?"

**Verdict:** **70B wins** — Explicitly references when the machine was acquired, shows continuity.

---

### 2. Emotional Nuance

**8B Emotional Range:** Generic expressions (playful, passion, amused, skeptical, enthusiastic, excitement, amusement, happy)

**70B Emotional Range:** Compound emotions (amused annoyance, slightly annoyed, confident, passionate) and more natural blends.

**Verdict:** **70B wins** — Emotions feel more authentic and character-specific.

---

### 3. Teasing Back (User Teases Character)

**8B Response** (User jokes about designer caring about kerning):
> "Oh, you think kerning is just for designers? Well, let me tell you, it's for anyone who cares about the subtleties of language and communication..."

**70B Response** (Same scenario):
> "Hey, someone's got to keep the typography police in business. And trust me, good kerning is not just about aesthetics, it's about readability and user experience. But hey, if you think it's 'just a designer thing,' go ahead and read a paragraph of text set in Papyrus with 0 tracking. See how that goes for you."

**Verdict:** **70B wins** — Uses humor ("typography police"), includes a clever jab (Papyrus with 0 tracking), feels more natural.

---

### 4. Humor & Wordplay

**8B Response** (User tells JavaScript therapy joke):
> "Oh man, that's a great one! Debugging issues, get it? Issues to debug, like problems in code, but also personal problems in therapy! That's some clever wordplay, I love it!"

**70B Response** (Same scenario):
> "I see what you did there, that's a pretty 'code'-pendent joke! But seriously, debugging can be a real 'variable' stress in a developer's life. Did they end up 'looping' back to the same problems in therapy?"

**Verdict:** **70B wins** — Builds on the joke with own wordplay ('code'-pendent, variable, looping), shows cleverness.

---

### 5. Disagreement & Reasoning

**8B Response** (User disagrees on Rust):
> "...the steep learning curve and performance implications might outweigh the benefits of memory safety for their specific use case. It's all about finding the right tool for the job..."

**70B Response** (Same scenario):
> "That's a common argument, but let's be real, how many production incidents are actually caused by memory safety issues versus other factors like bad design or poor testing? For most projects, the overhead of learning Rust's complex ownership model just isn't worth it."

**Verdict:** **70B wins** — Directly challenges the assumption, uses deeper reasoning, feels less diplomatic.

---

### 6. Character Consistency

Both models maintain character when given personality directives. However:
- **8B:** Stays in character but sometimes feels slightly generic
- **70B:** Weaves personality more naturally into responses

**Verdict:** **70B wins** — Character voice feels more integrated.

---

## Structured Output Reliability

Both models produce valid JSON 100% of the time when they respond.

The 70B timeouts are **not** a JSON problem — they're API responsiveness issues.

---

## Known Issues

### 70B Rate-Limiting / Timeouts

Three scenarios timed out with the 70B model:
1. "Unexpected topic change"
2. "User apologizes after conflict"  
3. "Ordinary everyday question"

**Possible causes:**
1. **Account quota limit** — Your NVIDIA account may have per-request or concurrent-request limits on the 70B model that the 8B doesn't have
2. **API rate limiting** — The 70B endpoint may be rate-limited for your tier
3. **Model load** — NVIDIA's 70B instance may be under heavier load than 8B

**Next steps to diagnose:**
1. Check https://build.nvidia.com/account/billing to verify your plan supports 70B
2. Look for rate-limit headers in responses
3. Test again with delays between requests
4. Contact NVIDIA support if quota limits are causing timeouts

---

## Recommendation

### **Upgrade to 70B** (meta/llama-3.1-70b-instruct)

**Why:**
- **Character quality is significantly better:** More natural teasing, humor, memory integration, emotional depth
- **Conversational feel is superior:** Feels like talking to a person, not an assistant
- **Reasoning is stronger:** Disagrees naturally, challenges assumptions
- **Memory is more coherent:** References specific details, not just generic acknowledgment
- **Emotional expressions are authentic:** Compound emotions ("amused annoyance") instead of single words
- **Wordplay and humor:** Builds on jokes instead of just acknowledging them

**Trade-offs:**
- API is slower (30% timeout rate in this test)
- May require account adjustment for rate limits
- Higher computational cost per request (but NVIDIA billing is usually based on tokens, not model size)

### **Interim Solution** (If 70B timeouts persist)

Use a **hybrid approach:**
1. Default to 70B for quality
2. Fall back to 8B on timeout (already in your error handling as `localBrain`)
3. This gives you 70B quality when available, 8B reliability when needed

### **Do NOT abandon 8B entirely**

The 8B model is:
- Perfectly fine for casual chat
- Useful as a fallback
- Good for testing and development
- Cheaper for high-volume uses

---

## Context & Prompt Strategy

Your current prompt is **excellent**:
- Character identity first
- Personality rules are clear
- Memory injection is selective
- Structured output format is explicit
- Emotional state is communicated
- Forbidden phrasings are listed

**No changes needed** — the prompt will work well with either model.

---

## Implementation

To upgrade, change your `.env`:

```bash
# From:
COMPANION_MODEL=meta/llama-3.1-8b-instruct

# To:
COMPANION_MODEL=meta/llama-3.1-70b-instruct
```

Restart the proxy server. The change is immediate — no code changes needed.

To test both without code changes, you can already do:
```bash
COMPANION_MODEL=meta/llama-3.1-70b-instruct node server/proxy.js
```

---

## Conclusion

**The 8B model is your current quality bottleneck.** The 70B model is a clear improvement across every dimension tested: memory, emotion, character consistency, reasoning, and natural conversation.

Upgrade to 70B. If timeouts persist, check your NVIDIA account quota. If they're truly blocking, the fallback to 8B keeps your app functional while investigating the rate-limit cause.

The quality gain is substantial and worth the API adjustment.
