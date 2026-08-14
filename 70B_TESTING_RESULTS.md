# 70B Model Testing Results

**Date:** 2026-08-14  
**Tested Models:**
- `meta/llama-3.1-8b-instruct` (current, baseline)
- `meta/llama-3.1-70b-instruct` (candidate upgrade)

---

## Executive Summary

**The 70B model is NOT recommended as the default at this time.** It experiences severe rate-limiting (75% timeout rate) on your current NVIDIA account tier. The 8B model is 100% reliable and serves as a solid fallback.

**Recommendation:** Keep 8B as the permanent default. Make 70B available as an optional development/testing model, but do not recommend it for user-facing chat until rate-limiting is resolved with NVIDIA.

---

## Test Results

### Reliability

| Model | Success Rate | Timeouts | Avg Latency | Valid JSON |
| --- | --- | --- | --- | --- |
| **8B** | 8/8 (100%) | 0 | 1,171 ms | 8/8 (100%) |
| **70B** | 2/8 (25%) | 6 | 9,918 ms | 2/2 (100%) |

**Verdict:** 8B is dramatically more reliable. 70B has an unacceptable timeout rate for production use.

---

### Latency Analysis

**8B Model:**
- Min: 420 ms
- Max: 3,484 ms
- Avg: 1,171 ms
- **Interpretation:** Consistent, predictable performance

**70B Model (when it works):**
- Min: 9,152 ms
- Max: 10,684 ms
- Avg: 9,918 ms
- **Interpretation:** When it works, it's slow and consistent, but timeouts dominate

**Verdict:** 8B is 8-9x faster and 100% available.

---

### Quality (When 70B Works)

On the 2 successful 70B calls, quality was visibly better:

**Test: Quick Question (tabs vs spaces)**
- **8B:** "Tabs are the clear winner, for alignment and speed reasons, in most terminal emulators. Spaces are more portable, but rely on configuration."
- **70B:** "Tabs, obviously. It's about flexibility and configurability. Spaces are a rigid, inflexible choice that ties code to editor settings."

**Verdict:** 70B is more opinionated and direct when it works, but reliability is more important than quality right now.

**Test: Context (long conversation)**
- **8B:** "By embracing a culture of experimentation, and actively soliciting and incorporating feedback..."
- **70B:** "Encourage experimentation, reward learning from failures, and lead by example. I've seen organizations..."

**Verdict:** Both handle context well when they work.

---

## Rate-Limiting Analysis

The 70B timeouts are consistent and immediate — all 6 timeouts hit exactly at 15 seconds with no partial responses. This indicates:

1. **Account-level rate limit** — You may have a quota or concurrent-request limit on the 70B model
2. **Tier-based access** — Your NVIDIA API tier may not fully support the 70B model
3. **Endpoint overload** — NVIDIA's 70B capacity may be under heavy load

**Next Steps to Investigate:**
1. Check your NVIDIA account at [build.nvidia.com](https://build.nvidia.com)
2. Look for billing/quota information specific to the 70B model
3. Try upgrading your account tier if available
4. Contact NVIDIA support to ask about 70B access limits for your plan

---

## Recommendation

### Current (Keep This)
- Default model: `meta/llama-3.1-8b-instruct`
- This is reliable, fast enough, and produces good character responses
- 100% availability is better than 25% + timeout UX

### Optional Development Use
- Make 70B available as `COMPANION_MODEL_DEVEL` or behind a feature flag
- Document the rate-limiting issue
- Test in development scenarios only
- When NVIDIA access is resolved, re-test and consider upgrading

### If You Upgrade Your NVIDIA Account
- Re-run `node server/test-70b.js` to verify 70B reliability
- If success rate reaches ≥95%, consider switching to 70B
- The quality improvement is real when available

---

## Offline Fallback

Your app already has an excellent offline fallback (`localBrain`). In production:
- 8B model is used first (reliable, fast)
- If timeout or network error, app falls back to offline brain gracefully
- User is informed: "AI backend unavailable — offline brain"
- Conversation continues without interruption

This is already properly implemented and working.

---

## Implementation

No code changes required. The app already supports model selection via `COMPANION_MODEL`:

**To test 70B (if you want to despite rate limits):**
```bash
COMPANION_MODEL=meta/llama-3.1-70b-instruct node server/proxy.js
```

**To stay on safe 8B (recommended):**
```bash
# .env already set to this
COMPANION_MODEL=meta/llama-3.1-8b-instruct
```

---

## Conclusion

The 8B model is your current bottleneck, but it's also your current strength in terms of reliability. The 70B model offers better character quality but is unusable in its current rate-limited state.

**Keep 8B. Document 70B as a future upgrade.**

When NVIDIA resolves your account access, the quality jump will be worth it. For now, focus on other improvements that don't depend on external factors.
