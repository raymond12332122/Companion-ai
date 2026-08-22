# Chibi Source Videos

Original, unmodified chibi video assets provided by the project owner via
the "UMAMUSUME Q&A" Google Drive folder. Preserved here as source
material, untouched.

Files (all present, sizes verified to match the Drive source exactly):

- `SPECIAL WEEK AND SILENCE SUZUKA WALKING CHIBI.mp4` — 2,777,095 bytes.
- `GOLDSHIP CHIBI DANCE.mp4` — 21,180,195 bytes. Uploaded directly (the Drive-download tool's 10MB cap blocked pulling it from Drive itself).
- `OGURI CAP DANCE.mp4` — 16,754,697 bytes. Same as above.

Do not delete, convert, re-encode, or otherwise modify these three files.

## Derivative clips (live, wired into the app)

Small derivative clips, cropped/trimmed/compressed from the source files
above with ffmpeg, live alongside them and *are* wired in as chibi-peek
videos (see `CHIBI_VIDEO_MAP` in `js/chibi.js`) — a character with a
listed clip shows it, looping, instead of a static image whenever they
come up for a peek. Each ships as both `.webm` (VP9, listed first so it
wins where supported) and `.mp4` (H.264, the fallback — needed for
Safari/iOS and any browser without a VP9 decoder) via sibling `<source>`
elements, since no single codec is guaranteed everywhere:

- `goldship-peek.webm` / `.mp4` (220×380, 3s loop, ~332KB / ~139KB) —
  cropped/trimmed from the Gold Ship dance source. Used for `gold-ship`.
- `oguricap-peek.webm` / `.mp4` (220×250, 3s loop, ~170KB / ~64KB) —
  same, for `oguri-cap` from the Oguri Cap dance source.
- `walking-peek.webm` / `.mp4` (240×164, ~1.1s loop, ~33KB / ~15KB) —
  cropped tightly to the ~1s window where Special Week and Silence
  Suzuka are walking closest together (before they drift apart across
  the frame), from the walking source. Since it's genuinely a shared
  clip of both of them, it's mapped to *both* `special-week` and
  `silence-suzuka` in `CHIBI_VIDEO_MAP` — whichever of the two comes up
  for a peek shows this same clip, rather than picking one of them to
  own it. All chibi-peek videos (this one included) render as a
  position:absolute/fixed overlay in `.chibi-layer` or `.page`, never as
  part of the normal document flow, so none of them can grow the page's
  height or width on any screen size.

Regenerating a derivative should always re-run from the untouched source
file above, never from a previous derivative. If GIF/still/transparent
versions are provided separately for other characters' peeks, those
belong in `assets/chibis/` following the `<character-id>.webp`
convention documented there, not here.
