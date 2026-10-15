# M1 transition visual review — 2026-10-15

The first 16:9 transition sample captured project frames
99,100,104,107,108,199,200,204,207,208 in
`outputs/render-run-ou3Ckn/report.json`. The run passed capture and encoding
checks: H.264, 1920×1080, 30 fps, 10 sampled frames, no reported errors.
Its output is `outputs/wide-transition-check.mp4` (SHA-256
`88612017d3f841b7e0826b8ff30285709b8180eedd58dbc82ffffa6d66419a44`).

Visual review found a presentation problem despite the technical pass:
[A→C middle frame](evidence/m1-transitions/old-a-c-middle.png) and
[C→D middle frame](evidence/m1-transitions/old-c-d-middle.png) show both titles
and shifted country outlines on top of each other. The MP4 contains sparse
non-contiguous samples, so it is not a continuous transition preview.

The renderer now fades the previous scene down against the dark map backdrop
for four frames, then fades the current scene up for four frames. The two
titles never occupy the same output frame. Source captures still pass the map
pixel check; dimmed transition frames are exempt from the normal color
threshold because low saturation is intentional. All 46 local tests and the
Vite build pass.

The revised browser sample `outputs/render-run-9qtul6/report.json` has
`status: capture-passed`, no errors, and eight faded frames. FFprobe confirms
12 H.264 frames at 1920×1080/30 fps. The MP4 SHA-256 is
`34a5d2e45875e0f92d9389351600d7e0394293c4ecf011e0de0031930191f264`.
Visual review of [A→C fade-out](evidence/m1-transitions/new-a-c-out.png),
[A→C fade-in](evidence/m1-transitions/new-a-c-in.png),
[C→D fade-out](evidence/m1-transitions/new-c-d-out.png), and
[C→D fade-in](evidence/m1-transitions/new-c-d-in.png) finds no overlapping
titles or double country outlines. The [sample MP4](evidence/m1-transitions/wide-transition-recheck.mp4)
and [run report](evidence/m1-transitions/recheck-report.json) are saved with
these frames. The sample uses non-contiguous project frames; it verifies the
selected transition states, not the playback rhythm of a continuous 10-second
render. The earlier sample remains evidence of the original issue.
