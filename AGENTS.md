# Working agreement for AI contributors

Read `Codex_Map_Video_Engine_Spec (1).md` and `docs/AI_HANDOFF.md` before changes.
The user requires **every change to be documented** so another AI can resume
quickly. For each code, asset, schema, test or example change, update
`docs/CHANGELOG.md` in the same work session. Update `docs/AI_HANDOFF.md` when
the architecture, commands, verified evidence or next steps change. Keep README
commands current.

State evidence precisely: schema validation, unit tests, Vite build, one-frame
browser capture, continuous MP4, and sustained benchmark are distinct gates.
Never describe a dry run, sparse sample or generated plan as a completed video.
The agent sandbox may close Chromium before capture; record that limitation and
continue work that does not need a browser. Keep subtitle rendering disabled
by default (`defaults.subtitlesEnabled: false`) until the user requests it.

Do not fabricate statistics, sources, licenses, research approvals, narration,
render results or benchmark results. Natural Earth country boundaries are
generalized and require editorial review for territorial claims. The stylized
globe is a separate proof; Google Earth/photorealistic globe remains outside
the spec. New project data must have source lineage and explicit caveats.

Run the narrow tests relevant to a change and the full `npm test` suite before
claiming a milestone. Browser dependent claims need a real target-machine
report and visual review. Preserve existing evidence under `docs/evidence/`;
do not overwrite it with newer runs.
