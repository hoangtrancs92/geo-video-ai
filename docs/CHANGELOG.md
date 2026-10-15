# Implementation change log

This is the durable record requested by the user. Each entry states code/data,
validation and remaining limitations; the older milestone documents retain
historical visual evidence.

## 2026-10-15 — Portable source for another Mac

- Copied the reviewed China/Japan dossier and script approval into `examples/`
  with their original bytes and hashes. The content generator now reads the
  checked-in dossier rather than an ignored workflow output.
- Added exact fresh-clone commands for installing dependencies, recreating
  local Linh voice tracks, preparing the two projects, probing WebKit,
  rendering chunks and running QA. WAVs and render outputs remain ignored;
  no new MP4 is claimed.
- Re-running the content generator preserved the approved content SHA-256.
  A clean preparation call using the checked-in dossier and approval produced
  short/long project manifests with the existing local voices; this verifies
  the portable input references, not a browser render.
- Initialized a clean local `main` Git history. Network restrictions blocked
  `git push`; GitHub API access worked without authentication, but the local
  credential helper returned empty credentials. A complete Git bundle was
  created and verified in ignored `outputs/` as a transfer fallback.

## 2026-10-15 — Safari engine render option

- Added `BROWSER_ENGINE=webkit` to project and chunk rendering. WebKit uses
  its own Playwright launch settings; preflight checks its binary and the
  chunk resume identity includes browser engine/path. Chromium remains the
  default.
- A real one-frame China/Japan EV WebKit probe reached browser launch but
  aborted in macOS `_RegisterApplication` before opening the project. Native
  `safaridriver` also exited immediately; enabling it required a password.
  No frame or MP4 was produced. See the production note and probe report.
- Focused browser option tests and full suite passed: 101 pass, one sandbox
  localhost skip, zero failures. Four-entry Vite build passed.

## 2026-10-15 — Scoped EV scripts, timed local voice and render preparation

- Added audited gap decisions to evidence review: a review may resolve named
  gaps with a concrete reason against the exact dossier hash. The dossier
  preserves `gapReviewLog`; unknown, duplicate or empty decisions fail.
  The workflow UI now presents a separate checkbox and rationale field for
  each gap; gap-only reviews are supported.
  Three high-priority China/Japan gaps were closed by explicit scope controls,
  leaving the graphics-rights question at medium priority. Workflow dossier
  version 2 and brief now report `ready_for_writing`.
- Added `scripts/create-china-japan-ev-content.mjs` and generated a distinct
  Vietnamese 90-second short and 900-second long ContentProject with 12 scenes,
  25 retained facts and cited narration. The generator validates schema and
  editorial readiness before writing. The workflow saved and approved the
  script under an explicitly labelled AI reviewer delegated by the user.
- Added optional segment target duration and macOS `say` rate to speech
  assembly. FFmpeg applies bounded tempo correction per segment, then lowers
  final voice gain by 2 dB. New integration coverage checks target timing,
  cue alignment and rejection of excessive tempo change. The two Linh tracks
  and SRT/ASS files were generated; automated audio QA passed at 90/900 s,
  -19.51/-19.54 LUFS and -2.33/-2.41 dBTP, with no >2 s silence.
- Prepared hash-bound short/long render projects and planned 2,700/27,000
  frames in 18/180 chunks. Chrome system one-frame capture failed immediately
  after launch; the Playwright default headless shell was absent. Technical QA
  correctly reports `missing_mp4` for both editions. No finished video or
  human listening/visual pass is claimed. See the production evidence note.
- Final verification: 100 tests passed, one localhost test skipped by sandbox,
  zero failed; four-entry Vite build passed. The reviewed dossier validates
  with 25 approved facts and one remaining medium-priority gap.

## 2026-10-15 — Delegated source audit for China/Japan EV claims

- At the user's explicit request, compared all 25 candidate claims against
  the IEA Global EV Outlook 2026 chapters, IEA cost PDF, CAAM figures on the
  China State Council portal, and JAMA's 2025 passenger-car survey. Recorded
  25 individual supported/approved decisions with reasons and the input hash
  in `docs/evidence/china-japan-ev-2025-review.json`; the reviewer is explicitly
  labelled as a Codex AI audit delegated by the user.
- Ran the existing hash-bound workflow review action. It wrote immutable
  `dossier-reviewed-1.json`, `script-brief-1.json` and an event entry. The
  reviewed dossier validates with 25 approved facts from four sources and
  four retained gaps. A source-excerpt draft was generated. The brief and
  excerpt remain `needs_research` due to a high-priority gap, so no script
  approval, TTS or render was started.
- Added `docs/evidence/china-japan-ev-2025-review.md` with source links and
  metric/rights caveats. This was AI review, not an independent human or legal
  review; CAAM/JAMA visuals and prose have not been licensed for reuse.
- Verified the reviewed dossier hash and schema; full `npm test`: 99 passed,
  one localhost skip, zero failed. Four-entry Vite build passed. The workflow
  still reports three high-priority gaps and `needs_research`.

## 2026-10-15 — Claim review cards in workflow UI

- Replaced the raw decisions JSON box with one review card per claim. Each card
  shows the claim text, existing status, qualifiers, cited source and license,
  linked observations, and explicit verdict/approval/reason controls. The page
  also shows unresolved research gaps and approved/pending counts.
- Only cards with a newly selected verdict or approval are submitted; no claim
  is approved by default. The UI checks the required pair, a reason of at least
  10 characters and supported verdict for approval. The API remains the
  authoritative validator and writes a new hash-bound dossier version.
- Reopening another workflow action does not erase unsent claim decisions;
  switching projects or saving a review reloads the evidence. Existing high
  priority gaps still block the brief until separately researched and revised.
- Direct workflow tests and inline script syntax passed. Full `npm test`:
  99 passed, one sandbox localhost skip, zero failed. Four-entry Vite build
  passed; source hash validation still reports 25 claims, zero approved and
  four gaps. No human claim review, browser visual check or topic MP4 occurred.

## 2026-10-15 — China/Japan electric-car research intake

- Added `examples/china-japan-ev-2025-dossier.json` for a 2025 market-focused
  China/Japan comparison: four pinned local source captures (IEA 2026 report,
  IEA cost brief, CAAM figures republished by China's State Council portal,
  JAMA consumer survey), 14 observations and 25 source-linked **candidate**
  claims. All claims remain `needs_review`; four explicit gaps include
  incompatible EV/NEV definitions, rights and insufficient long-form depth.
- Added `docs/evidence/china-japan-ev-2025-research.md` with source links,
  editorial outline and caveats. IEA report/brief are CC BY 4.0. The China
  portal prohibits republication without authorization; JAMA reuse rights are
  not verified. Their captured pages are for local research only and must not
  appear as screenshots or copied prose in a released video.
- `evidence:validate` verified all source hashes and schema; `scripts:draft`
  correctly returned `needs_research`, with zero approved facts. Created the
  local workflow job `china-japan-ev-2025` in that state. No approved script,
  speech track, caption alignment or MP4 was produced.
- Full `npm test`: 99 passed, one localhost test skipped by sandbox, zero
  failed. Four-entry Vite build passed. Neither result verifies visual/browser
  rendering for this topic.

## 2026-10-15 — Versioned script authoring workspace

- Added `POST/GET /api/documentaries/:id/scripts/draft` for hash-versioned
  ContentProject drafts. Saving requires the same project and a matching prior
  draft hash, records the dossier snapshot, and returns an explicit readiness
  check. Incomplete narration can be saved, but approval still requires the
  complete schema, exact approved fact/source lineage, distinct short/long
  plans and the editorial substance gate.
- Added short/long editor tabs to the workflow page. It imports a local
  ContentProject JSON, edits titles, hooks, narration and fact refs, displays
  approved claims with source titles, saves drafts, and fills the approved
  draft path for human signoff. Scene and outline creation still require a
  ContentProject input; this is an editor, not automatic documentary writing.
- Shared `assertScriptReady` between approval and preparation so the editor
  readiness result matches the render preparation gate. Direct API tests cover
  saving, reloading, stale edits, incomplete drafts and approval rejection.
- Narrow workflow/orchestration tests, inline UI script syntax check, full
  `npm test` (99 passed, one sandbox localhost skip, zero failed) and four-entry
  Vite build passed. Browser UI and real documentary render remain unverified.

## 2026-10-15 — Editorial substance gate and workflow event history

- Preparation and script approval now require at least 20 approved claims, 10
  distinct long-edition fact references from at least three sources, citations
  on at least 80% of segments, and narration between 1.5 and 4 words per
  target second. These are structural checks; repeated or false prose can
  still pass, so human factual and editorial approval remains necessary.
- Raised the speech segment text limit from 180 to 1,200 characters so a
  90-second narrated segment can satisfy the pacing gate. SRT/ASS still use
  segment timing; word-level alignment and subtitle layout for long segments
  are not verified. Subtitle rendering remains off by default.
- Workflow transitions now append `events.ndjson` with action, actor, before/
  after status and gate snapshot. `GET /api/documentaries/:id/events` and the
  workflow UI show this history. Added synthetic rejection and API tests.
- Final `npm test`: 99 passed, one localhost test skipped by sandbox, zero
  failed. Four-entry Vite build passed. No browser render or documentary MP4
  was produced in this continuation.

## 2026-10-15 — Grounded excerpt provider, subtitle timing, documentary QA and WDI cache

- Added an offline `EditorialProvider` that creates distinct short/long
  **source-excerpt drafts** using only exact approved claim text. A Zod schema
  and grounding verifier reject changed narration or source links. The CLI
  `scripts:write` and workflow `POST /scripts/generate` store a dossier-hash
  bound draft. The repository sample correctly returns `needs_research` and
  empty segments. This is not a completed 90-second/15-minute script.
- `speech:assemble` now writes ASS as well as SRT from measured audio segment
  boundaries, normalizes cue whitespace and rejects more than two seconds of
  silent tail. Synthetic FFmpeg tests cover both subtitle formats and the
  overlong tail. Word-level forced alignment remains unavailable.
- Added `documentary:qa` and workflow QA action. They verify input/source and
  project hashes, per-edition render hashes, FFprobe frame count/codec/
  resolution, expected audio track and loudness/silence. Missing MP4s are
  reported as `missing_mp4`; technical pass still requires human visual,
  listening and editorial review. The workflow also exposes resumable long
  retry after failed or partial renders. No actual short/long MP4 passed QA.
- World Bank direct retrieval now has a 24-hour SHA-256 cache and rolling
  20-request daily quota guarded by a lock. Responses are normalized before
  caching; corrupt cached bytes fail. Offline `--raw-input` is unchanged.
  Tests verify cache reuse, quota and concurrent misses with synthetic data;
  live retrieval remains unverified in this sandbox.
- Full `npm test`: 96 passed, one localhost test skipped (`EPERM`), zero failed.
  Four-entry Vite build and Node syntax checks passed. `scripts:write` against
  the sparse repository dossier returned `needs_research`; no render was run.
- Added workflow `audio/assemble` for each edition. It requires the speech
  manifest's segment IDs/text, duration and rights to match the hash-approved
  ContentProject and verifies the output voice path. The prepare action passes
  the bundled FFprobe path to its child process when no system `ffprobe`
  exists. The synthetic integration test now assembles a 90 s test tone voice
  before preparing both editions; this verifies wiring, not spoken words.
  ASS caption canvas now follows the edition's required 1080×1920 or
  1920×1080 dimensions from the speech manifest.
- Exported the workflow HTTP handler for direct API tests without a socket.
  Intake, claim review, excerpt generation and QA route responses passed;
  the independent socket/browser test remains skipped by sandbox `EPERM`.
  Workflow JSON inputs and local evidence sources now reject symlinks that
  escape the workspace, with a targeted test.
- Full `npm test` after these changes: 98 passed, one localhost test skipped,
  zero failed. Four-entry Vite build and Node syntax checks passed. No actual
  documentary MP4 render was performed.
- Workflow and standalone documentary QA now select bundled `tools/ffprobe`
  when the system command is absent, matching the prepare/render path.

## 2026-10-15 — Workflow approvals, render control and audio QA

- Moved workflow state transitions into `scripts/workflow-actions.mjs` so they
  can be tested without binding localhost. Claim review creates a versioned
  dossier and brief; script approval requires a ready evidence brief, matching
  ContentProject lineage, reviewer/note and exact content/dossier hashes.
  Approved evidence cannot be changed without starting a new project. Prepare
  and render planning call the existing hash-gated documentary CLIs.
- Added API/UI actions for evidence review, script approval, preparing both
  editions, render planning and a background resumable render job. The job
  writes a log and status file. QA status rechecks the approved content hash
  and reads per-edition render status; browser and actual background render
  behavior have not been verified in this sandbox.
- Added `audio:qa` using FFmpeg loudness and silence analysis with configurable
  LUFS, true-peak and maximum-silence thresholds. Synthetic audio tests pass
  a continuous tone and flag a long silent tail. It is a review gate, not
  proof of audible quality or word-level alignment.
- A direct synthetic integration test verifies review → approval → prepare →
  2,700/27,000-frame plan and rejects a content file modified after approval.
  No continuous short/long MP4 was produced.
- Full `npm test`: 92 passed, one localhost test skipped (`EPERM`), zero failed.
  `npm run build` passed for four HTML entries; Node syntax checks passed.
- Ran the macOS `say` adapter with Vietnamese voice `Linh`: 2.359773 s of
  measured speech assembled into a 4 s WAV/SRT. Automated audio QA passed at
  -17.7 LUFS and -1.03 dB true peak; the probe has test-only rights metadata,
  no production voice rights or listening review. See
  `docs/evidence/m13-local-say-report.md`.
- Preflight passed with `FFPROBE_PATH` pointed at bundled `tools/ffprobe`.
  One-frame globe capture still failed at Chrome launch with `Target page,
  context or browser has been closed`; report retained under
  `outputs/render-run-zwLk5W/report.json`. No frame or MP4 resulted.

## 2026-10-15 — Editorial brief, measured speech and workflow intake

- Added `docs/IMPLEMENTATION_PLAN.md` with evidence gates and explicit remaining
  work for scripts, speech, API/UI and target-machine rendering.
- Added `scripts:draft`. It checks a local dossier's source hashes and creates
  separate 90-second/900-second source-linked writing briefs. It requires six
  approved claims for the short, twenty for the long and three distinct
  sources for long readiness. It copies approved claim text and source links;
  it does not invent or approve narration. Sparse input returns
  `needs_research`. Added focused tests for blocked and sufficiently populated
  synthetic dossiers.
- Added `speech:assemble` for imported licensed audio segments and an optional
  macOS `say` adapter. FFprobe measures segment durations; FFmpeg joins and
  pads the voice track to a target; SRT cues use measured segment boundaries.
  Captions remain disabled. A synthetic two-clip test verifies cue timing,
  final WAV duration and rejection of overlong speech. Local `say`, word-level
  forced alignment and loudness QA have not been verified.
- Added a local workflow server and UI with dossier intake, immutable state,
  evidence and brief views, artifact listing and pending QA report. It does
  not yet expose script approval/render orchestration endpoints. The API test
  skips network assertions if the sandbox blocks localhost; browser visual
  review remains pending.
- Added `npm run build` for all four HTML entries. Full `npm test` passed with
  90 tests and one localhost API test skipped because this sandbox denies bind;
  Vite built all four entries. `scripts:draft` against the sample returned
  `needs_research` with zero approved claims. No target render was run.

## 2026-10-15 — Two-edition preparation and render coordination

- Added `documentary:prepare` to turn a manually authored, approved
  ContentProject into separate short/long ProjectSchema render inputs. It
  verifies the dossier's raw source hashes, exact fact and source metadata,
  script approval hashes, map features/styles/transitions and audio assets.
  It writes an immutable manifest with input/source/project hashes, map and
  audio asset licenses/checksums, and edition frame counts. Render planning
  rechecks those hashes and rejects a modified project.
- Added `documentary:render` for independent short/long chunk jobs, plan mode,
  per-edition status and resume. A failed edition does not erase a completed
  other edition. Render mode has not passed a target browser run.
- Preparation rejects obviously thin plans: fewer than two short scenes and
  script segments, fewer than ten long scenes and segments, fewer than three
  long chapters, duplicate narration segments or a segment over 90 seconds.
  These are minimal structural checks; they cannot judge factual or editorial
  quality.
- Integration test created both render projects and a 2,700/27,000-frame chunk
  plan from synthetic approved content, checked one-edition planning and
  modified-project rejection, then deleted the temporary files. The full
  `npm test` suite passed 86/86 and Vite built all three HTML entries.
  It did not produce the required 90-second and 15-minute MP4s.

## 2026-10-15 — Licensed SFX and music mixing

- Extended ProjectSchema audio with music rights/gain and frame-based SFX cues
  with required license and attribution. Cue IDs are unique and cue intervals
  must fit the video timeline. Existing projects still parse with empty SFX and
  default music gain.
- Replaced voice-only mux with a local FFmpeg mix of imported voice, music and
  SFX. Music is attenuated by `duckingDb` when voice exists; SFX is trimmed and
  delayed by frame, including partial one-shot renders. The output is one AAC
  stream with a limiter. The chunk renderer still keeps intermediate chunks
  video-only and hashes every audio asset for resume identity.
- Real synthetic media tests verify voice+music AAC and audible SFX only during
  its cue window. A chunk assembly test verifies one SFX cue spanning the
  chunk boundary is mixed once on the final timeline. This does not establish
  a target-Chrome project render,
  speech-aware ducking, loudness compliance or a finished documentary.

## 2026-10-15 — Manual claim review and first official indicator adapter

- Added `evidence:review`: a reviewer supplies a claim decision, reason and
  SHA-256 of the exact input dossier. The command verifies local source bytes,
  rejects stale or duplicate decisions, writes a new dossier without replacing
  the old one, and records reviewer/time/reason in `reviewLog`. The evidence UI
  displays this history. No claim is approved automatically.
- Added a bounded World Bank Indicators API v2/WDI adapter and
  `evidence:worldbank` CLI. Inputs constrain indicator/country/year scope and
  require an explicit unit; normalization rejects malformed, incomplete,
  mismatched and duplicate response rows. Missing values remain null. The raw
  response is retained with SHA-256, and the dossier has no approved claims.
- Added `examples/world-bank-gdp-request.json`. Direct `curl` retrieved a 502
  byte response for 2020 GDP (current US$) for JP/CN; `--raw-input` normalized
  it into `outputs/evidence/world-bank-gdp-2020-dossier.json`. Validation
  confirmed two observations and the raw checksum. Editorial gate correctly
  returned `needs_research` because the dossier has a high-priority gap and no
  approved facts. This historical sample is not a complete economic story.
- Sandbox Node child processes could not resolve `api.worldbank.org`; direct
  `curl` succeeded. The CLI supports direct fetch on a host with network access
  and offline import of already retrieved bytes. Indicator-specific licensing,
  definitions and units require review; caching/quotas beyond one bounded
  request and a full source connector workflow remain unfinished.

## 2026-10-15 — M10 local evidence review table

- Added `engine/evidence.html` and `engine/evidence.ts`, linked from the preview.
  The page loads a local dossier JSON or the existing sample, validates it with
  `EvidenceDossierSchema`, and lists sources, observations, claims and research
  gaps without changing review status. It displays source path/URL, retrieval
  date, license, commercial-use field, raw hash and linked item counts.
- Documented the existing manual CSV/JSON import command and evidence CLI in
  README. Imported data remains pending review; no facts or source rights were
  inferred.
- The dossier schema now rejects an approved quantitative claim that cites a
  null observation. Pending review may still reference missing observations
  so the research gap can remain visible.
- `npm test` passed 76/76; a Vite build with both HTML entries passed; the
  sample dossier passed `evidence:validate` with pinned raw bytes. Browser
  review was blocked because this sandbox denied the local Vite port (`EPERM`).
  This is not visual browser verification or a completed M10 milestone.

## 2026-10-15 — Documentation handoff and implementation audit

- Added `AGENTS.md` so future AI contributors read the spec and handoff, update
  this log for every change, and distinguish tests from real video evidence.
- Added `docs/AI_HANDOFF.md` with architecture, commands, evidence gates and
  open milestones. No renderer behavior changed in this entry.
- Audit finding: M0b is incomplete (2,250/9,000 frames); the current A/C/D
  MP4 is a 10-second technical demo, not either required edition. No claim of
  complete v1.2 product is supported.

## 2026-10-15 — M10 offline evidence foundation

- Added `packages/evidence/src/dossier.schema.ts` for strict v1.2 source,
  observation and claim data. It checks unique IDs, source/observation lineage,
  supported-only approval and quantitative claims with observation references.
- Added `packages/evidence/src/offline.ts` and `evidence:validate` to hash-check
  local raw source bytes before accepting a dossier. `approvedFacts` exports
  only supported, approved claims into the v1.1 fact shape.
- Added `examples/evidence-map-dossier.json` from the existing pinned Natural
  Earth raw file. It has one **pending review** qualitative map claim, zero
  approved facts, zero observations and one high-priority research gap. It does
  not claim to support a statistical documentary.
- Three focused evidence tests and the offline CLI passed. This is a schema and
  validation foundation, not complete M10 or a research approval workflow.
- Added `packages/evidence/src/metrics.ts`: auditable difference, growth,
  CAGR and percentage-point calculations return input observation IDs and
  source IDs. Tests reject null values, different years for direct comparison,
  incompatible source/dataset/unit/currency/price basis, invalid growth bases
  and missing currency price basis. Three metric tests pass. These functions
  do not create claims or approve data automatically.
- Added `packages/editorial/src/gate.ts` and `editorial:gate`. A high-priority
  dossier gap, zero approved facts, or conflicting/unsupported claims return
  `needs_research`. If a fully authored two-edition ContentProject is later
  supplied, the gate compares every content fact/source ID to the approved
  dossier and rejects altered statements or lineage. This CLI does **not**
  generate a short/long script; the current example correctly stops at
  `needs_research`. Two gate tests and the full 72-test suite passed.

## 2026-10-15 — Imported voice in MP4

- Extended `ProjectSchema.audio` with required license and attribution when
  `voiceover` is set. `scripts/audio.mjs` verifies a local voice file, exactly
  one audio stream, whole-project duration and SHA-256; unsupported music is
  rejected explicitly instead of silently omitted.
- One-shot rendering now trims the voice by global `startFrame` and muxes AAC
  into the MP4. Chunk rendering keeps intermediate chunks video-only and muxes
  the full voice only after concatenation, so resume cannot repeat or drift
  audio at chunk boundaries. The voice hash participates in chunk identity.
- FFprobe checks the final AAC stream and duration. A real synthetic FFmpeg
  media integration test passed; the full suite passed **73/73**. This verifies
  the mux path, not a target-Chrome project render with spoken narration.
- No TTS, speech alignment, music mix, loudness/silence QA or imported-voice
  browser render has been completed. `--sample-frames` with voice requires
  `--video-only` because arbitrary frames have no contiguous audio timeline.

## Earlier work (historical summary)

- M0/M1: deterministic MapLibre/deck.gl capture, pixel guard, FFmpeg MP4,
  repeatability, resume, natural-earth JPN/CHN registry and 300-frame flat
  A→C→D render. Evidence: `docs/M0-report.md`, `README.md`.
- M2/M3/M4: A/C/D variant fixtures and sparse browser reviews. Evidence:
  `docs/M2-style-a-status.md`, `docs/M3-style-c-status.md`,
  `docs/M4-style-d-status.md`.
- M5 partial: preview selector, frame seek and scene composition CLI.
  `docs/M5-preview-status.md` records limits.
- Subtitles paused by user via `defaults.subtitlesEnabled: false`; source cue
  data remains, historical caption screenshot is not current output.
- Stylized Natural Earth globe prototype added, but no target-machine frame
  has been checked. See `docs/globe-prototype.md`.
