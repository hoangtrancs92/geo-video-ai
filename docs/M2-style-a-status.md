# M2 Style A status — 2026-10-15

`examples/style-a-variants.json` defines three consecutive 100-frame scenes at
1080×1920/30 fps: cinematic focus, cinematic duel, and route reveal. Each has
a moving camera. The renderer now applies distinct region paint and borders:
focus dims the unselected country and widens the selected border; duel colors
both country borders; route reveal retains the frame-defined luminous
Tokyo–Beijing illustrative path and endpoint. The line is a visual connection,
not a claim about transport service or trade.

The asset registry pins the local Natural Earth GeoJSON checksum, source ID,
public-domain status and attribution. The validation CLI checks it before
rendering; the chunked renderer includes registry and source metadata hashes
in its resume identity.

The target-machine browser captured frames 50, 150 and 250 in
`outputs/render-run-1tFecP/report.json`. FFprobe confirms H.264 at
1080×1920/30 fps, three decoded frames and no reported errors. The sample MP4
SHA-256 is `7b9f4eeec318fabcfa12b344c150eab0b099385a9f953beefe908a239330172b`.
Visual review confirms that [focus](evidence/m2-style-a/focus.png) leaves China
subdued and outlines Japan; [duel](evidence/m2-style-a/duel.png) shows both
countries in separate colors; [route reveal](evidence/m2-style-a/route.png)
shows the luminous partial path and endpoint with Tokyo/Beijing labels. The
[sample MP4](evidence/m2-style-a/style-a-samples.mp4) and
[report](evidence/m2-style-a/report.json) are saved as durable evidence.

Validation performed after the M3 comparison fixture was added: 52/52 local
tests, project schema/asset validation, Vite bundle, and a 3×100-frame chunk
plan. The three sample frames are non-contiguous and do **not** constitute the
required continuous 10-second M2 demo. Camera motion over time, transition
rhythm, and complete output still need a full render.
