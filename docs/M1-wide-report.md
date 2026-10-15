# M1 16:9 visual smoke — 2026-10-15

Project: `examples/japan-china-wide.json`; browser run:
`outputs/render-run-HpXVNm/report.json`.

Chromium 155.0.8059.79 with SwiftShader captured project frames 65 (A route),
180 (C prism), and 200 (D card). FFmpeg produced a 3-frame H.264 MP4 at
1920×1080/30 fps. ffprobe reports 0.100000 s and 3 decoded frames. The MP4
SHA-256 is `150f34cf76a695cb33be01087c94546d01a5095f41f630ac4db875a3ea0c7de2`.
The source run report has `status: capture-passed` and no errors.

Visual review of original PNGs:

- [A frame 65](evidence/m1-wide/a-route.png): both countries fit on the right;
  the Tokyo–Beijing illustrative path, endpoint, and labels are visible. Title
  and attribution remain readable on the left.
- [C frame 180](evidence/m1-wide/c-prism.png): China has visible top and side
  faces. The 500 km elevation is an exaggerated visual setting, not a measured
  geographic statistic.
- [D frame 200](evidence/m1-wide/d-card.png): the source card is on the left and
  does not cover the map on the right.

Artifacts: [MP4](evidence/m1-wide/wide-samples.mp4) and
[run report](evidence/m1-wide/report.json). The three frames are non-contiguous;
this smoke does **not** prove a continuous 10-second 16:9 video, 15–20-minute
long edition, transition quality, voice/captions, or editorial correctness.
The fade implementation was added after this capture, so these artifacts do not
verify it.
The route is a visual connection, not evidence of a transport service. Map data
comes from the locally imported Natural Earth 1:110m subset and attribution is
visible in each sample.
