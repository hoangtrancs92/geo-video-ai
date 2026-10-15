# AI handoff — Map Video Engine

Updated 2026-10-15. Read the [v1.2 specification](../Codex_Map_Video_Engine_Spec%20(1).md)
and [change log](CHANGELOG.md) before modifying this project. The code lives
in this directory; it is not a Git repository in the current workspace.

## Latest continuation

Repository handoff: user requested publishing the source to
`https://github.com/hoangtrancs92/geo-video-ai.git` for rendering on another
Mac. The remote was empty and public when checked. The reviewed dossier and
script approval are now copied byte-for-byte to `examples/`, and the China/Japan
content generator reads the checked-in dossier. README has the fresh-clone
speech, prepare, WebKit probe, render and QA commands. Generated WAVs, MP4s,
`node_modules` and local binaries are excluded from Git. Publishing status and
remote commit verification are pending GitHub authentication and network access.
The generator preserved approved content SHA-256
`b97b9138415ac81d4b671ee791fa44ba1a26a1b8cfdc361f5096e00fff9f3523`;
`documentary:prepare` with checked-in dossier/approval passed locally after
setting `FFPROBE_PATH` to the local binary. This test used existing WAVs.
Local Git branch `main` was initialized and committed. Direct `git push` failed
because Git could not resolve `github.com` in this sandbox. `curl` reached
GitHub API, but no GitHub credentials were available in this session; remote
publishing remains pending. A verified full-history Git bundle is available at
`outputs/map-video-engine-main.bundle` (ignored by Git) for transfer.


Tenth continuation: user requested Safari after Chrome's macOS launch crash.
`BROWSER_ENGINE=webkit` now selects Playwright WebKit for one-shot and chunk
documentary rendering; Chromium remains default. WebKit rejects Chromium-only
Chrome path and SwiftShader flags. Preflight checks the WebKit executable,
and chunk identity records the selected engine and binary path. Native Safari
`safaridriver` exited immediately; enabling it required an administrator
password. Official Playwright WebKit 18.4 was downloaded via curl into a
temporary writable path because Playwright's installer DNS failed. Both
`about:blank` and the short project's one-frame probe then aborted during
macOS `_RegisterApplication`, before project JavaScript or frame capture.
Report: `outputs/documentaries/china-japan-ev-2025/render-run-6yT4Ii/report.json`.
No MP4. Retry the documented WebKit probe in an interactive macOS session,
then run the short and long chunk renders after visually checking the frame.
Verification: full `npm test` 101 passed, one localhost sandbox skip,
zero failed; four-entry Vite build passed.


Ninth continuation: user explicitly relaxed sourcing and approved AI-authored
content. Three high-priority China/Japan gaps were resolved through new
hash-bound `gapDecisions`, with scope controls (IEA BEV+PHEV comparison,
CAAM NEV separately, no company forecasts) recorded in
`docs/evidence/china-japan-ev-2025-scope-review.json`. Dossier version 2 is
`ready_for_writing`; one medium graphics-rights gap remains.
`scripts/create-china-japan-ev-content.mjs` generated 90 s/900 s distinct
Vietnamese ContentProject and speech manifests. `assertScriptReady` passed,
the workflow saved and approved a draft labelled AI editorial review delegated
by the user. Both local Linh voice WAVs, SRT and ASS were assembled with
bounded segment tempo adjustment and -2 dB final gain. Audio QA passed:
short 90 s/-19.51 LUFS/-2.33 dBTP; long 900 s/-19.54 LUFS/-2.41 dBTP;
no >2 s silence. No independent listening or macOS voice distribution-rights
review was performed.
`outputs/documentaries/china-japan-ev-2025/` holds hash-bound short/long
projects and a render plan of 2,700/27,000 frames (18/180 chunks). System
Chrome one-frame probe failed after launch (`render-run-ZIWWOP/report.json`);
default Playwright headless shell is absent. Technical QA reports `missing_mp4`
for both editions. See `docs/evidence/china-japan-ev-2025-production.md` for
exact commands and limitations. Next: browser one-frame visual check on the
target Mac, then resume both continuous renders and inspect audio/visual QA.
Full `npm test` after this continuation: 100 passed, one sandbox localhost
skip, zero failed. Four-entry Vite build passed; dossier v2 hash validation
passed with 25 approved facts and one medium gap.

Eighth continuation: the user explicitly delegated approval without waiting.
Codex checked all 25 China/Japan EV candidate claims against current official
IEA, CAAM and JAMA pages and recorded individual reasons in
`docs/evidence/china-japan-ev-2025-review.json`. Reviewer identity clearly
says AI source audit delegated by the user. `reviewEvidence` produced
`outputs/workflow/china-japan-ev-2025/dossier-reviewed-1.json` (SHA-256
`d2063a5e924a88d7c320932c1c2501e9d5060b6226573f1ebb78dd3dbfaa5b25`).
`evidence:validate` reports 25 approved facts, four sources, 14 observations
and four unresolved gaps. The workflow brief and generated source excerpts
still report `needs_research` because of a high-priority gap. This AI review
does not claim independent human/legal approval, script approval, speech or
MP4. See `docs/evidence/china-japan-ev-2025-review.md` for source links,
scope and rights cautions. Next: research/resolve the high gaps with an audited
dossier revision; author two scoped scripts; generate/check voice and render.
Verification after review: full `npm test` 99 passed, one sandbox localhost
skip, zero failed; four-entry Vite build passed. The state has three high
priority gaps and `needs_research`.

Seventh continuation: `engine/workflow.html` now presents individual claim
review cards with source links, license/commercial flag, observation values,
qualifiers, current status and explicit verdict/approval/reason controls. Only
newly decided cards are sent to the existing hash-bound review API. High
priority research gaps are displayed but remain unresolved; a reviewer cannot
turn the China/Japan 2025 dossier into a ready brief by approving claims alone.
No human review or video render was performed. Direct workflow tests and UI
script syntax passed; full `npm test`: 99 passed, one sandbox localhost skip,
zero failed. Four-entry Vite build and source hash validation passed. Local
job state remains `needs_research` with zero approved claims. Browser visual
review remains pending.

Sixth continuation: user chose the topic “xe điện của Trung Quốc và Nhật Bản”.
The 2025 market comparison now has a source-pinned candidate dossier at
`examples/china-japan-ev-2025-dossier.json` and a review note at
`docs/evidence/china-japan-ev-2025-research.md`. It contains 4 local sources,
14 observations and 25 claims, none approved; `evidence:validate` passed and
`scripts:draft` returned `needs_research`. Local workflow job
`outputs/workflow/china-japan-ev-2025/` was created with that status. The IEA
electric-car measure (BEV+PHEV) and CAAM NEV measure must not be compared as
identical. China/JAMA source visuals and prose cannot be reused without rights
review. Need human factual/translation/rights review, more long-form sources,
two independent scripts, audio and actual browser render. Full `npm test`:
99 passed, one localhost skip, zero failed; four-entry Vite build passed.
This supersedes older counts below.

Fifth continuation: the workflow now has a versioned manual script workspace.
`POST/GET /api/documentaries/:id/scripts/draft` stores short/long
ContentProject edits under `outputs/workflow/<id>/`, checks optimistic hashes
and dossier version, and reports `ready_for_review` or `needs_revision`.
Incomplete narration may be saved but cannot be approved. The browser page can
import a ContentProject JSON and edit short/long titles, hooks, segment text
and factRefs beside approved claims/source titles. It still requires the
author to supply ContentProject structure, scenes and outlines; no finished
factual script is generated automatically. API and syntax tests pass; target
browser visual review, source research, speech QA and both MP4s are pending.
Narrow workflow/orchestration tests and inline UI script syntax passed; full
`npm test`: 99 passed, one localhost skip, zero failed; four-entry Vite build
passed. This supersedes the older counts below.

Fourth continuation: `packages/editorial/src/substance.ts` adds structural
script checks at approval and prepare: 20 approved claims, source/citation
coverage for both editions, and 1.5–4 words per target second. This does not
prove factual correctness or prose quality; synthetic repeated-word fixtures
only verify the gate and pipeline. The speech segment text cap is now 1,200
characters to permit 90-second scripts. Subtitle cues remain segment-level.
Workflow transitions append `outputs/workflow/<projectId>/events.ndjson`; API
`GET /api/documentaries/:id/events` and the UI expose action, actor and gate
history. Short/long MP4s and browser QA are still absent. Final `npm test`:
99 passed, one localhost test skipped, zero failed; four-entry Vite build
passed. This supersedes the older counts below.

Third continuation: `scripts:write` and an offline `EditorialProvider` emit
short/long **approved-claim excerpts**, not complete scripts; they are tied to
the exact dossier hash and verified for unchanged text/source links. The
sample still returns `needs_research`. `speech:assemble` now exports SRT and
ASS and refuses more than two seconds of silent tail. `documentary:qa` checks
hashes, real MP4 frames/codec/dimensions and audio, reports missing files and
never marks human visual/listening/editorial review done. Workflow API/UI
exposes excerpt generation, technical QA and resumable long retry. The World
Bank direct adapter now has a 24-hour cache and 20-call daily quota; network
retrieval is still unverified here. This continuation did not create either
real documentary MP4 or pass browser/localhost gates.
Workflow now also has `audio/assemble` for each approved edition; it checks
exact script segment IDs/text, rights, duration and voice path. A synthetic
90 s tone passed the full audio→prepare path, which does not verify actual
speech. Child prepare/render commands use bundled FFprobe automatically when
the system binary is absent.
The HTTP workflow handler is now tested directly without localhost; the
browser/socket check remains blocked by sandbox `EPERM`. API JSON inputs and
local source files reject symlinks outside the workspace. Full verification:
98 tests passed, one localhost test skipped, zero failed; four-entry Vite build
passed. This supersedes prior counts below.
Verification after this continuation: 96 passing tests, one localhost test
skipped, zero failed; four-entry Vite build passed. `scripts:write` on the
sample returned `needs_research` with no narration segments. These counts
supersede older counts lower in this handoff.

Earlier continuation:

Second continuation: `scripts/workflow-actions.mjs` now implements versioned
claim review, hash-bound ContentProject approval, two-edition preparation,
render planning and background resumable render launch. The workflow UI/API
exposes these transitions, but localhost/browser and a real background render
remain unverified in this sandbox. A direct synthetic integration test passed
review → approval → prepare → 2,700/27,000-frame plan and stale-content
rejection. `npm run audio:qa -- --input path` measures loudness, true peak and
long silence; a synthetic audio test passed. Actual local `say`, word-level
alignment, human editorial approval, final audio listening/visual QA and the
two real MP4s remain pending.
The local Vietnamese `say` probe succeeded technically (2.359773 s speech,
4 s WAV, SRT; audio QA -17.7 LUFS/-1.03 dBTP). It has test-only rights and
no listening review. See `docs/evidence/m13-local-say-report.md`. Browser
capture was retried with one globe frame and failed at Chrome launch; exact
report: `outputs/render-run-zwLk5W/report.json`. No MP4 from this probe.
Current suite after this continuation: 92 passed, one localhost test skipped,
zero failed; four-entry Vite build passed. This supersedes the prior counts
below.

Previous continuation:

See [implementation plan](IMPLEMENTATION_PLAN.md). `npm run scripts:draft --
--dossier examples/evidence-map-dossier.json` now emits separate source-linked
short/long writing briefs with `needs_research` for this sparse sample. It is
not a finished script. `npm run speech:assemble -- --manifest path.json
--output-dir outputs/speech/id` joins licensed imported segments (or uses
macOS `say`) and measures caption boundaries with FFprobe; synthetic imported
audio tests pass, but the local TTS adapter has no target voice QA. Captions
stay off. `npm run workflow` serves a local intake/dashboard on port 4180 with
evidence, brief, artifact and pending QA views. Localhost remains blocked in
this sandbox, so the API/browser have no live verification here. API approval,
render controls, a complete human-reviewed factual script, word alignment,
loudness QA and two continuous target-machine MP4s still remain. Do not mark
M12–M14 or final delivery complete from the brief, audio fixture or plan.
Current verification: 90 passing tests, one localhost API test skipped due
`EPERM`, four-entry Vite build passed. The brief CLI returned `needs_research`
for the repository sample. `npm run build` writes `outputs/site-build/`.

## What runs today

- Node 24 / npm project, Zod v1 ProjectSchema, MapLibre 5.6.1 + deck.gl 9.1.14,
  Playwright/Chromium frame capture and FFmpeg H.264 encode. `npm test` has 90
  passing tests and one localhost API test skipped in this sandbox.
- `npm run video:validate -- --input examples/japan-china-map.json` validates
  schema, registered asset checksum and feature references.
- `npm run video:render` captures a bounded one-shot frame range; `npm run
  video:render:chunks` resumes verified chunks and concatenates. The latter's
  `--plan` performs validation without opening Chrome.
- `npm run preview` serves `engine/preview.html` on localhost:4173. It can
  select fixtures or local `outputs/projects/*.json`. Interactive preview has
  not been browser-verified from this sandbox.
- `npm run video:compose` reindexes compatible existing scenes to make a new
  ProjectSchema JSON. It does not generate a documentary script.
- `npm run evidence:validate -- --input examples/evidence-map-dossier.json`
  checks a strict v1.2 offline dossier and local raw source checksum. Its
  example has no observations or approved facts; it intentionally reports a
  high-priority research gap. `packages/evidence/src/metrics.ts` offers
  definition-safe calculations with input IDs; it does not approve claims.
  See `packages/evidence/src/`.
- `npm run evidence:import` ingests a local CSV/JSON observation array into a
  pending-review dossier with raw source hash. `/engine/evidence.html` now
  displays a read-only source/observation/claim/gap table for a local dossier
  or the sample. Vite build passed, but the sandbox denied a local browser
  server (`EPERM`), so the page has no browser visual review yet. Approved
  quantitative claims can no longer cite null-valued observations.
- `npm run editorial:gate -- --dossier examples/evidence-map-dossier.json`
  currently returns `needs_research` (high-priority gap, zero approved facts).
  `packages/editorial/src/gate.ts` prevents a later manual ContentProject from
  changing approved fact text or source lineage. An evidence-linked brief
  generator exists; no completed narration generator exists.
- `documentary:prepare` now requires exact content/dossier approval hashes and
  creates separate renderable short/long projects plus an input/source hash
  manifest. `documentary:render --plan` validates the pair and shows chunk
  counts; render mode coordinates the two existing chunk jobs independently.
  Synthetic 90s/900s planning passed, including modified-project rejection,
  but no real approved content or browser MP4 pair exists. Script generation,
  TTS and full editorial QA remain unfinished.
- `evidence:review` now records explicit human claim decisions against a dossier
  hash and preserves review history in a new file. `evidence:worldbank` imports
  bounded WDI API v2 data, or an existing raw response via `--raw-input`.
  `outputs/evidence/world-bank-gdp-2020-dossier.json` contains two real 2020
  GDP observations and no approved claims; editorial gate remains
  `needs_research`. Direct `curl` worked here, but Node child-process DNS did
  not, so the live CLI fetch path has not passed in this sandbox.
- `examples/earth-globe-intro.json` is an **unverified browser proof** using
  a 177-feature pinned Natural Earth world asset and MapLibre globe projection.
  The prior 300-frame A→C→D MP4 uses a **flat Mercator** map. Globe is not
  yet mixed into that MP4.
- Subtitle rendering and SRT export are gated by `defaults.subtitlesEnabled`;
  it defaults to `false` by the user's request. Old caption evidence predates
  this flag.
- Imported voice, music and frame-based SFX now require license/attribution.
  One-shot and chunk render mix to AAC; intermediate chunks remain video-only.
  Every audio asset hash is part of resume identity. Synthetic FFmpeg tests
  verify SFX timing and voice+music mux, but no audio project has passed browser
  capture yet. Music ducking is fixed attenuation during voice. Imported speech
  segments now have measured timing/SRT. A Vietnamese macOS `say` technical
  probe and automated loudness/silence analysis passed; word alignment,
  production voice rights and human listening QA remain unavailable.

## Verified evidence and limits

| Gate | Current evidence | Limit |
| --- | --- | --- |
| M0 100-frame render/repeat | `docs/evidence/m0/`, `docs/evidence/m0-repeat/` | Same machine/environment only |
| M0b sustained scale | `outputs/m0b/benchmark` reached 2,250/9,000 frames | 5-minute benchmark incomplete |
| Flat A→C→D | `outputs/japan-china.mp4` produced after 10 chunks | Predates later style/text/globe code |
| A/C/D variant visuals | `docs/evidence/m2-style-a/`, `m3-style-c/`, `m4-style-d/` | Sparse frames, not continuous demos |
| 16:9 and fade | `docs/evidence/m1-wide/`, `m1-transitions/` | Sparse browser frames |
| Globe | Schema/asset validation, Vite build and chunk dry run pass | No real browser frame or MP4 yet |
| Short/long content | Schema, evidence-linked briefs and synthetic render plans | No approved distinct scripts or two MP4s |

The agent sandbox closes Chromium before capture. Target-machine one-frame
commands are in [README](../README.md). Never mark a browser gate passed from
unit tests or a `--plan` result.

## Main files and data flow

`examples/*.json` → `ProjectSchema` → registered GeoJSON checksum validation →
`engine/main.ts` frame state (`packages/motion`) → MapLibre/deck.gl → Playwright
PNG → FFmpeg → MP4. `scripts/render-project-chunks.mjs` wraps bounded captures
with fingerprints, checkpoints, ffprobe and resume. `packages/schema/src/
content.schema.ts` describes future two-edition content but has no planner.
Natural Earth import and provenance live under `assets/geodata/` and
`assets/registry.json`. `scripts/audio.mjs` verifies licensed imported voice,
music and SFX and mixes them after video encode; `--sample-frames` with any
audio needs `--video-only`.

## Priority work remaining from spec

1. Complete M0b sustained 5-minute benchmark on the target Mac and record
   actual time, RAM/VRAM and disk. This cannot be inferred from 2,250 frames.
2. Browser-check globe one frame, then decide whether to build an explicit
   globe→flat transition. Browser-check preview and text overflow guard.
3. Complete M2–M5 continuous demos and variant/fallback checks. Existing
   style implementations are partial, not full preset registries.
4. Complete the M12 editorial writer and approved short/long scripts from
   enough sourced facts. `scripts:draft` produces briefs only, while
   `documentary:prepare` accepts manually authored ContentProject but does not
   write one. No 90–180s short or 900–1200s long MP4 exists.
5. Finish M11/M13/M14: source cache/quotas, TTS or local voice adapter,
   speech alignment/loudness QA, API/UI wizard, real two-edition browser render
   and sustained benchmark. Offline/manual mode must work without paid services.

Preserve the user's subtitle pause. If factual inputs are insufficient for a
15–20 minute documentary, produce a `needs_research` state rather than padded
footage or invented facts. Every change must be entered in `CHANGELOG.md`.
