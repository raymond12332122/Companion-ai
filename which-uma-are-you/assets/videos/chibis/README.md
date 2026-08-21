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

Three small derivative clips, cropped/trimmed/compressed from the source
files above with ffmpeg, live alongside them and *are* wired in. Each
ships as both `.webm` (VP9, listed first so it wins where supported) and
`.mp4` (H.264, the fallback — needed for Safari/iOS and any browser
without a VP9 decoder) via sibling `<source>` elements, since no single
codec is guaranteed everywhere:

- `walking-loop.webm` / `.mp4` (640×174, ~19s, ~340KB / ~186KB) —
  cropped to the action band of the walking source, muted. Rendered as a
  looping banner between the quiz header and the question card
  (`quiz.html`, `.walking-banner`).
- `goldship-peek.webm` / `.mp4` (220×380, 3s loop, ~332KB / ~139KB) —
  cropped/trimmed from the Gold Ship dance source. Used as a chibi peek
  for `gold-ship` in place of a static image (see `CHIBI_VIDEO_MAP` in
  `js/chibi.js`).
- `oguricap-peek.webm` / `.mp4` (220×250, 3s loop, ~170KB / ~64KB) —
  same, for `oguri-cap` from the Oguri Cap dance source.

Regenerating a derivative should always re-run from the untouched source
file above, never from a previous derivative. If GIF/still/transparent
versions are provided separately for other characters' peeks, those
belong in `assets/chibis/` following the `<character-id>.webp`
convention documented there, not here.
