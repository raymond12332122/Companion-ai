# Chibi Assets

Permitted chibi-style character images go here, one per character,
named to match that character's `id` in `js/characters.js`:

```
assets/chibis/<character-id>.webp
```

Example: Gold Ship (`id: "gold-ship"`) → `assets/chibis/gold-ship.webp`

No image files are bundled in this repository yet — `js/chibi.js`
references this path pattern for any character in the current roster,
and simply does nothing (no placeholder, no broken-image icon) if a
given character's file doesn't exist. See
`docs/fan-content-permissions.md` for why: assets are provided
separately by the project owner.

Keep these small (a chibi renders around 80-100px wide on screen) and
transparent-background where possible — they appear briefly over the
existing UI, not inside a card.
