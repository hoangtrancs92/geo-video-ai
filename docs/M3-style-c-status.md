# M3 Style C status — 2026-10-15

The existing `country-prism` has passed browser frame 180 in both portrait and
landscape examples. The new `examples/style-c-variants.json` defines two
150-frame portrait scenes: one CHN prism and one two-country height comparison.
Both values are explicitly illustrative visualization settings, not measured
geographic heights or country statistics. The scene title and persistent
eyebrow disclose that status.

The schema requires `country-prism` to have a positive extrusion and
`comparison-heights` to include at least two distinct positively extruded
regions. The renderer supports these two variants through the existing
frame-driven `GeoJsonLayer` elevation accessors, with explicit update triggers
for each frame. `floating-islands` remains unsupported and fails clearly at
validation or render preflight.

The target-machine browser captured frames 100 and 250 in
`outputs/render-run-VVua1Q/report.json`: `capture-passed`, no errors, H.264,
1080×1920, 30 fps, two decoded frames. The MP4 SHA-256 is
`1a72e969856a27f64b6a4ba5e058eadd273648ac30b8afa3a4164c3ad43e6e40`.
Visual review confirms that [country prism](evidence/m3-style-c/prism.png) has
visible top and side faces, while [comparison](evidence/m3-style-c/comparison.png)
shows two separate colored prisms. The [sample MP4](evidence/m3-style-c/style-c-samples.mp4)
and [report](evidence/m3-style-c/report.json) are preserved. The Japan prism is
small relative to China because the fixture retains geographic footprint;
neither prism height represents a measured value.

The fixture passes project/asset validation, a 2×150-frame chunk plan, Vite
build and the 53-test suite. The two samples are non-contiguous and do not
verify a continuous 10-second M3 demo. Sustained performance benchmark and
low-GPU fallback are still pending.
