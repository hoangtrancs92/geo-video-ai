# M5 preview status — 2026-10-15

`engine/preview.html` is a local browser preview for the existing A/C/D,
stylized Earth globe and mixed fixtures or a composed JSON under
`outputs/projects/`. It selects a
project, fits its native portrait/landscape
canvas to the available panel, and seeks deterministic frames. The scene label
shows preset and variant. For an A→C or C→D fade, it uses the same source-frame
and opacity plan as the MP4 exporter; the browser overlay approximates the
exporter's pixel fade over RGB `(3,13,27)`.

Run `npm run preview`, then open `http://127.0.0.1:4173/engine/preview.html`.
The preview needs working WebGL2 in the local browser. The 62-test suite passes,
including transition source-frame tests, and both preview/renderer HTML entries
build with Vite. The agent sandbox closes Chromium before capture, so the
interactive page has **not yet been visually checked in a target browser**.

This is a local project selector and frame preview, not an editor or proof of full
M5. Scene JSON editing, arbitrary project upload, rendered MP4 comparison and
continuous mixed-style demos remain pending.

`npm run video:compose` now creates a new ProjectSchema JSON by selecting scene
IDs from compatible source projects. It copies their existing map/camera/style
data, reindexes the scenes, and uses fade between scenes. Output, locale, map
and audio contracts must match the chosen base project; it rejects missing or
unsupported scenes. The CLI validates the registered geodata before writing.
An A focus → C prism → D editorial sample was composed to
`outputs/projects/acd-composed.json`: 400 frames, 62 tests pass, project
validation passes and an eight-chunk dry run passes. The new composition has
not yet been rendered in a target browser. Its base project keeps subtitles
disabled.
