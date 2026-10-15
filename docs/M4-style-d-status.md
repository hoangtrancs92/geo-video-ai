# M4 Style D status — 2026-10-15

The existing `split-comparison` layout has passed earlier browser samples.
`examples/style-d-variants.json` now adds an `editorial-card` scene with a
larger sourced card. Its text uses the Natural Earth boundary caveat instead
of fabricated statistics. The schema requires exactly one sourced card for
this variant. `timeline-panel` remains schema-reserved and fails render
validation explicitly.

The target-machine browser captured frames 100 and 250 in
`outputs/render-run-3U1UPU/report.json`: `capture-passed`, no errors, H.264,
1080×1920/30 fps and two decoded frames. The MP4 SHA-256 is
`1d918ce007a2501b9e0da66070440de53d5baf4427745d1b779f02b170d6d8d9`.
Visual review found [split comparison](evidence/m4-style-d/split.png) readable,
with the source card left of the map. In the first
[editorial card](evidence/m4-style-d/editorial-before-fix.png), the wide card
covered the map's southern tip. A layout fix now gives the card the remaining
bottom space by preventing the attribution footer from sharing the flexible
vertical gap. The target-machine recheck at frame 250 passed capture/encode QA:
H.264, 1080×1920, one frame, no errors, SHA-256
`e0d4e6fa14963573685fa33742fb585a9f73f195bb488ddcb7c8c2830a96e364`.
The [revised image](evidence/m4-style-d/editorial-after-fix.png) shows the full
map and a readable card/attribution without overlap. Its
[report](evidence/m4-style-d/recheck-report.json) and
[MP4](evidence/m4-style-d/editorial-recheck.mp4) are preserved. The
[initial report](evidence/m4-style-d/initial-report.json) and
[sample MP4](evidence/m4-style-d/initial-samples.mp4) record the issue.

The two 150-frame scenes pass schema and asset validation, a 2×150-frame
chunk plan, Vite build and the 55-test suite. A manual subtitle cue was added
to the editorial scene at local frames 20–129. It renders from the same
frame-defined data as the [SRT](evidence/m4-style-d/style-d-variants.srt),
whose absolute interval is `00:00:05,667 → 00:00:09,333`. The schema rejects
overlapping/out-of-range cues and more than two lines. The renderer reserves
the bottom safe area and fails a frame if the subtitle intersects its card or
attribution. The target-machine browser frame 250 passed capture/encode QA:
H.264, 1080×1920/30 fps, one decoded frame, no errors and MP4 SHA-256
`456ed3cda475fe366f2ad8cec567bd90bdc7f4f90488412b2362f7949c2b40c6`.
The [caption frame](evidence/m4-style-d/subtitle-frame-250.png) was reviewed:
the subtitle, card, complete map and attribution are readable without overlap.
Its [report](evidence/m4-style-d/subtitle-report.json) and
[MP4](evidence/m4-style-d/subtitle-frame-250.mp4) are preserved. This is a
single-frame layout check, not a continuous playback check.

This is not full M4: localized fonts, additional infographic layouts, audio
alignment and a continuous demo remain pending.

**2026-10-15 scope change:** subtitle work is paused by request.
`defaults.subtitlesEnabled` defaults to `false`; the D fixtures explicitly set
it to `false`. The renderer now omits captions and SRT export yields zero cues
while disabled. The caption frame and SRT links above are historical evidence
from before this flag was turned off, not the current render result. Cue data
remains in the fixtures so it can be resumed later without recreating timing.

Locale layout groundwork: `examples/style-d-vi.json` and
`examples/style-d-ja.json` now provide Vietnamese and Japanese editorial-card
fixtures with frame-defined subtitles. The renderer sets the document locale,
uses local Japanese font fallbacks and breaks long text within title, card,
subtitle and attribution boxes. A per-frame guard reports
`TEXT_LAYOUT_OVERFLOW` if any measured text box clips or leaves the viewport.
Both fixtures pass project/asset validation, and their UTF-8
[Vietnamese](evidence/m4-style-d/style-d-vi.srt) and
[Japanese](evidence/m4-style-d/style-d-ja.srt) SRT files were exported. The
62-test suite and engine/preview build pass. Actual glyph coverage and
appearance are **not yet browser-verified**.
The agent's browser launch closed inside its sandbox before capture; this
does not indicate a project render failure. Localized caption browser checks
are deferred while subtitles are disabled. Font redistribution needs license
review before any font is bundled.
