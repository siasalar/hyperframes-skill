---
name: edit-video
description: Edit a raw talking-head video through transcription, silence trimming, mistake review, visual storytelling, motion graphics, and verified HyperFrames rendering. Use for a complete edit; route a single requested operation directly to its specialist skill.
---

# Edit a video

Keep each project in `video-projects/<slug>/`, preserving the source recording.
Read the workspace guide and the project's brief or DESIGN.md. If a direction is
missing, propose a style from `style-library/registry.json` based on the footage.
For a reel, YouTube Short, or short ad, use `../short-form-edit/SKILL.md` instead.
Compose and render only with HyperFrames; never build a separate Puppeteer or
canvas renderer, even if a prompt names one.

1. Inspect duration, streams, and source resolution with ffprobe. Copy the source
   into the project's assets or reference an explicitly provided local path.
   When a reference video is supplied, analyze it with
   `../short-form-edit/references/reference-analysis.md`, including the measured
   `Reference spec` (layout modes, framing, card size, transitions, captions,
   palette, motion), and use it as the default look unless the brief overrides it.
2. Choose the transcription path with "Choose a transcription path" in
   `docs/TOOLS-AND-API-KEYS.md`: reuse a matching word transcript, else ElevenLabs
   through its connector (`docs/CONNECTED-SERVICES.md`) or its API key
   (`node scripts/transcribe-elevenlabs.mjs <source> --language <code>`), else local faster-whisper sized to the machine
   (`python3 scripts/transcribe-faster-whisper.py --check`). Set the spoken
   language explicitly (`fa` for Persian). Ask before checking the computer or
   installing anything; let the user choose online (paid) or local (free, uses
   their CPU/GPU) per `docs/CONNECTED-SERVICES.md`, and
   explain uploads and costs before any service call not yet authorized.
   If the edit may use generated images, video, music, or voice, run the
   generation-account check in `docs/GENERATION-ACCOUNTS.md` now: offer the
   connected Higgsfield account first, then Kie.ai or other accounts if declined.
   With two or more main recordings, transcribe each, then join them with
   `node scripts/splice-sources.mjs` as described in `../short-form-edit/SKILL.md`
   (default: the second recording goes right before the first one's hook), get
   the splice review approved, and continue with the combined video and transcript.
3. Read `../cut-silences/SKILL.md`. Produce an EDL and a retimed transcript, and
   render the silence pass when editing is authorized.
4. Read `../cut-mistakes/SKILL.md`. Inspect candidates in context and preserve
   intentional emphasis. Record the reviewed cuts. If no mistakes need cutting,
   carry forward the silence output. Match every transcript to its actual video.
   Cutting is not changing the voice: never denoise, EQ, compress, normalize, or
   retime the speaker's audio, or regrade their footage, unless asked. If a hard
   join clicks, only a 10-20 ms fade at that join is allowed.
5. Read `../video-storytelling/SKILL.md` for the visual arc and
   `../hyperframes-video-beats/SKILL.md` for overlays. Write a beat sheet with
   transcript anchors, one visual idea per beat, and deliberate callbacks.
   Every inserted visual must meet `../short-form-edit/references/broll-quality.md`;
   render the two style frames it describes and get the look approved before the
   beat sheet is built out.
   Then show the beat sheet as a visual storyboard
   (`node scripts/storyboard-sheet.mjs storyboard.json --open`) and wait for the
   user's approval before building any composition; then record it with
   `node scripts/approve-storyboard.mjs video-projects/<slug>`. Style frames live in
   `video-projects/<slug>/style-frames/`. A general "edit this video"
   instruction does not approve the style frames or the storyboard.
6. Read `MOTION_PHILOSOPHY.md`, `../hyperframes/SKILL.md`, and relevant GSAP
   references before authoring. Use `../style-library/SKILL.md` to select or
   adapt a card. Localize every asset used by the composition.
7. Run preflight and HyperFrames lint from the project, plus the transcript-sync
   validator for anchored sub-compositions. Review Studio before the draft.
8. Render a draft, inspect encoded frames and transitions, and listen across cut
   boundaries. Check face framing, text legibility, black frames, and A/V sync.
   Resolve failures before the final render. Follow any review approvals already
   provided; do not repeat approval requests for the same authorized action
   (the style-frame and storyboard gates always need their own approval).

Deliver the final MP4 path, edit decisions, retimed transcript, composition,
and `VERIFY.md` describing what was checked and any remaining limitations.
An automated detector proposes edits; editorial judgment remains necessary.
