# Local Vietnamese TTS probe — 2026-10-15

This is a technical voice test, not a licensed documentary narration.

- Adapter: `/usr/bin/say`, voice `Linh` (`vi_VN`), one test sentence.
- Measured speech: 2.359773 s (FFprobe); assembled WAV: 4.000 s with a
  1.676 s silent tail. SRT used the measured segment boundary. Subtitles were
  not enabled on any video.
- Output: `outputs/speech-local-probe/voice.wav`,
  `outputs/speech-local-probe/captions.srt`,
  `outputs/speech-local-probe/audio-qa.json`.
- Audio QA: -17.7 LUFS integrated, -1.03 dB true peak, no gap over the
  configured 2 s threshold. This was an automated measurement only; no human
  listening or pronunciation review was recorded. Production rights for this
  system voice have not been established.

One-frame globe capture still failed at Chrome launch. The exact report is
`outputs/render-run-zwLk5W/report.json`; it says `browserType.launch: Target
page, context or browser has been closed`. No PNG or MP4 was produced by that
probe. Preflight passed only after setting `FFPROBE_PATH="$PWD/tools/ffprobe"`.
