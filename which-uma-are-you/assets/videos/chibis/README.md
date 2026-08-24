# Chibi Source Videos

Original, unmodified chibi video assets provided by the project owner via
the "UMAMUSUME Q&A" Google Drive folder. Preserved here as source
material, untouched.

Files (all present, sizes verified to match the Drive source exactly):

- `GOLDSHIP CHIBI DANCE.mp4` — 21,180,195 bytes. Uploaded directly (the Drive-download tool's 10MB cap blocked pulling it from Drive itself).
- `OGURI CAP DANCE.mp4` — 16,754,697 bytes. Same as above.

Do not delete, convert, re-encode, or otherwise modify these files.

(The Special Week / Silence Suzuka walking source and its
`walking-peek` derivative were removed per direct request — only the
Gold Ship and Oguri Cap chibi peeks are wired into the app now.)

## Derivative clips (live, wired into the app)

Small derivative clips, cropped/trimmed/compressed from the source files
above with ffmpeg, live alongside them and *are* wired in as chibi-peek
videos (see `CHIBI_VIDEO_MAP` in `js/chibi.js`) — a character with a
listed clip shows it, looping, instead of a static image whenever they
come up for a peek. Each ships as both `.webm` (VP9, listed first so it
wins where supported) and `.mp4` (H.264, the fallback — needed for
Safari/iOS and any browser without a VP9 decoder) via sibling `<source>`
elements, since no single codec is guaranteed everywhere:

- `goldship-peek.webm` / `.mp4` (220×380, 3s loop, ~380KB / ~189KB) —
  cropped/trimmed from the Gold Ship dance source, audio track kept
  intact. Used for `gold-ship`.
- `oguricap-peek.webm` / `.mp4` (220×250, 3s loop, ~175KB / ~68KB) —
  same, for `oguri-cap` from the Oguri Cap dance source. Its audio track
  is kept intact too, but the source itself has no audible sound
  anywhere in its runtime (confirmed via volume analysis: true digital
  silence, not a trimming artifact) — this is a property of the source
  file, not something lost in extraction.

All chibi-peek videos render as a position:absolute/fixed overlay in
`.chibi-layer` or `.page`, never as part of the normal document flow, so
none of them can grow the page's height or width on any screen size.
`oguri-cap` additionally spawns once per quiz as a persistent,
user-draggable companion (see `spawnDraggableCompanion()` in
`js/chibi.js`) rather than the normal timed peek — it stays on screen,
following the user's drag, until the quiz page itself unloads.

Regenerating a derivative should always re-run from the untouched source
file above, never from a previous derivative. If GIF/still/transparent
versions are provided separately for other characters' peeks, those
belong in `assets/chibis/` following the `<character-id>.webp`
convention documented there, not here.
