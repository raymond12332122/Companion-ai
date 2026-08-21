# Audio Assets

Permitted sound effects go here. No audio files are bundled in this
repository — `js/audio.js` references the paths below, and gracefully
does nothing if a file is missing (see `docs/fan-content-permissions.md`
for why: assets are provided separately by the project owner).

```
assets/audio/
  trait-determination.mp3
  trait-kindness.mp3
  trait-confidence.mp3
  trait-competitiveness.mp3
  trait-discipline.mp3
  trait-chaos.mp3
  trait-optimism.mp3
  select.mp3            fallback, only used if a trait name isn't recognized
  results-reveal.mp3     plays once, when the results page reveals a match
  easter-egg.mp3          rare (~6% per answer), replaces the trait sound
  special-week-rain.mp3   very rare (~0.2% per answer, once per session),
                          plays alongside the Special Week Rain overlay --
                          see js/specialWeekRain.js
```

All files are short SFX (well under a second is plenty) — these play on
every answer tap, so anything longer will feel laggy rather than snappy.

## About the "Mambo-style" easter egg

The V0.6.2 brief asked for a rare "Mambo-style" easter-egg sound. This
codebase only wires up the *trigger* (`easter-egg.mp3`, ~6% chance per
answer) — it does not assume or embed any specific audio. If "Mambo-style"
refers to an actual existing song (e.g. Lou Bega's "Mambo No. 5"), that is
unrelated to the Umamusume fan-content permission already on file in
`docs/fan-content-permissions.md`, which covers character
characteristics/personality/sprites/images only — not third-party music.
Using a real copyrighted song here would need its own separate rights
clearance. Whatever file gets placed at `easter-egg.mp3` should be
something the project owner has confirmed is fine to use for this
purpose.
