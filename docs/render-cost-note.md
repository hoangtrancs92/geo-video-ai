# Current SwiftShader render cost — 2026-10-15

The completed 300-frame portrait project used 10 chunks of 30 frames. Its
resume attempt rendered 270 new frames in 675.464 seconds, including browser
startup, repeated Vite builds, capture, per-chunk encode/decode QA, and final
assembly. This is **2.502 wall seconds per new frame** on this one Mac/Chrome
SwiftShader environment. The report is
`outputs/japan-china.mp4.work/report.json`; one previous 30-frame chunk was reused.

Mechanical projection at the same rate (not a benchmark result):

| Target | Frames at 30 fps | Projected wall time |
| --- | ---: | ---: |
| 150-second short | 4,500 | ~3.1 hours |
| 900–1,200-second long | 27,000–36,000 | ~18.8–25.0 hours |

The project was a sparse map demo, not a full documentary. 30-frame chunks add
browser/build overhead; 150-frame chunks could reduce that overhead, while
captions, audio, denser scenes, and horizontal QA could add work. The unfinished
M0b synthetic benchmark has verified only 2,250/9,000 frames and cannot certify
sustained production throughput. Do not promise or start the 15–20-minute
edition on this backend until a sustained chapter benchmark measures actual
throughput, memory, disk and failure recovery. Hardware WebGL or a different
approved capture environment may be needed; no speedup is assumed here.
