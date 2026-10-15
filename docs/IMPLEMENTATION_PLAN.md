# Documentary completion plan (2026-10-15)

This plan tracks acceptance evidence, not a claim that a dry run is a video.

| Stage | Work | Acceptance gate | State |
| --- | --- | --- | --- |
| 1. Editorial | Produce separate short/long evidence-linked drafting briefs; require reviewed claims, source lineage, and explicit reviewer approval | A sparse dossier returns `needs_research`; each proposed chapter names fact IDs and sources; `documentary:prepare` rejects stale approval | China/Japan 2025 has distinct 90/900-second AI-authored scripts approved under user delegation; independent human copy review and target visuals pending |
| 2. Speech | Assemble licensed voice segments or a local TTS voice; measure each audio file, align caption cues to those measurements, check the final track | FFprobe timing and FFmpeg audio integration tests; captions stay disabled by default | China/Japan Linh voice 90/900 s and SRT/ASS assembled; automated loudness/peak/silence QA passed; word alignment, release rights and human listening pending |
| 3. Workflow | Local API and UI for evidence, scripts, approvals, render status and artifacts with durable state | API tests and browser review on the target Mac | Core actions, versioned script editor, event history, retry and technical QA implemented; direct tests pass, localhost/browser and real render review pending |
| 4. Delivery | Source and review enough facts for two distinct editions, render 90–180 s and 900–1200 s MP4s, inspect audio and frames, finish sustained benchmark | Two real MP4s with FFprobe reports, source manifest, visual review and target-machine performance report | China/Japan projects planned (2,700/27,000 frames); system Chrome fails one-frame launch in this sandbox; MP4s and target-machine review pending |

The currently imported World Bank sample has two observations and no approved
claims. It cannot support a factual 15-minute script. A human must review
claim accuracy, wording and geopolitical treatment; source licenses and voice
rights must be documented. Target-machine browser access is required for the
final render and visual QA.

World Bank direct retrieval now has a 24-hour SHA-256 cache and a 20-call
rolling daily quota. The offline raw-input path remains available without
network access. Cached responses are normalized before storage; a cache hit
does not imply a claim is editorially approved.
