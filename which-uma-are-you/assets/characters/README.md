# Character Assets

Permitted character images go here, one per character, named to match
that character's `id` in `js/characters.js`:

```
assets/characters/<character-id>.webp
```

Example: Special Week (`id: "special-week"`) → `assets/characters/special-week.webp`

No image files are bundled in this repository yet — see
`docs/fan-content-permissions.md` for why (images are provided separately
by the project owner, under the project's fan-content permission terms).
`js/characters.validate.js` checks that any `image` path present on a
character follows this naming convention, but does not require the file
to actually exist on disk yet.
