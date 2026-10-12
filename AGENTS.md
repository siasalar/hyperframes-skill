# hyperframes-skill: workspace guide

Turn a talking-head recording into an intentional edit using local HyperFrames
rendering, transcript-driven cuts, and reusable motion graphics.

## Runtime routing

`AGENTS.md` and `CLAUDE.md` contain the same standing guide. Keep them synchronized.
Claude Code uses `.claude/skills/`. Codex uses the generated `.agents/skills/`.
Edit canonical skills in `.claude/skills/`, then run `npm run sync:skills`.
Use `$edit-video` in Codex, `/edit-video` in Claude Code, or natural language.
Route without being told: a talking-head recording to a reel, Short, or short ad
uses `short-form-edit`; a longer edit uses `edit-video`. When the format is not
stated, the default deliverable is an Instagram Reel: 9:16, 1080x1920, MP4. Two
or more main recordings are joined first with `scripts/splice-sources.mjs`
(default: the second goes right before the first one's hook), after approval.
Compose and render only with HyperFrames, never a separate Puppeteer or canvas
renderer, even if a prompt names one.
Model and permission choices belong to the user; `.codex/config.toml` only adds
document loading defaults. Work locally unless the user requests subagents.

## Start and route

Read `README.md` for installation and `docs/WORKFLOW.md` for a complete edit.
Use `edit-video` to coordinate transcription, cuts, design, and verification.
For one stage, load the matching local skill:

| Need | Skill |
| --- | --- |
| Reels, Shorts, and short advertisements | `short-form-edit` |
| Motion-design showreels and brand reels cut to music | `motion-showreel` |
| Existing May Shorts example maintenance | `short-form-video` |
| New motion-graphics video from a brief | `make-a-video` |
| Website-inspired compositions | `website-to-hyperframes` |
| Full raw-video edit | `edit-video` |
| Silence removal | `cut-silences` |
| Retakes, false starts, or stutters | `cut-mistakes` |
| Narrative arc, persistent world, and visual callbacks | `video-storytelling` |
| Overlay beats, paper takeovers, and glass cards | `hyperframes-video-beats` |
| Select or extend styles and templates | `style-library` |
| HTML compositions and media timing | `hyperframes` |
| Preview, lint, and rendering | `hyperframes-cli` |
| Timeline animation | `gsap` |
| Install HyperFrames catalog blocks | `hyperframes-registry` |

Before a creative session read `MOTION_PHILOSOPHY.md` and the project's DESIGN.md.
The philosophy's fast sizzle pacing is a style reference. Give educational speech
room to breathe. The project brief controls pacing, palette, and typography.
Framework skill contracts override historical code recipes in the style guide.

## Workspace

Create a project with `npm run new-video -- my-video`. Keep source media, EDLs,
transcripts, compositions, and renders together under `video-projects/<slug>/`.
Run HyperFrames from that project's directory. The root `scripts/` utilities
accept paths from the working directory. `style-library/registry.json` indexes
cards; each style has a DESIGN.md, CSS tokens, and named text slots.
See `style-templates/README.md` for whole-scene templates.

Preserve raw files. Use a new output filename for each editing stage. Archive
obsolete work. Video projects, personal footage, transcripts, credentials, and
renders are gitignored. The 12 already-published projects are retained as teaching examples; new private
projects stay ignored. Do not treat existing public examples as permission to add
new personal footage. Never print secrets or copy private media into library examples.

## Editing and timing

After installing the kit and at the start of any edit, run the service check in
`docs/CONNECTED-SERVICES.md`: detect connected connectors (Higgsfield, ElevenLabs)
and set keys, then report one short status list. Never open with "add keys to
.env"; users may only have connectors. Prefer a connector over an API key.
Before choosing a transcription, asset-generation, or voiceover service, read
`docs/TOOLS-AND-API-KEYS.md` and check the user's provider choice and local setup.
ElevenLabs Scribe is the default; honor requests for OpenAI Whisper, local
Whisper, or another provider. Normalize verified word timestamps for the cutting
tools. Pick transcription with "Choose a transcription path" in that guide:
reuse an existing transcript; otherwise ask permission to check the computer,
then let the user choose online (connector or key, paid) or local faster-whisper
(free, uses their CPU/GPU); never pick silently, never install GPU drivers;
always pass the spoken language, and ask before installing. Before planning any
generated image, video, music, or voice, follow `docs/GENERATION-ACCOUNTS.md`:
if a Higgsfield connector is connected, ask to use it; if declined or missing,
offer Kie.ai or other configured accounts, then no-generation. Kie.ai is optional
and needs a configured integration and credits. Reuse existing transcripts and
assets; make any unapproved uploads or paid calls concrete before asking.

Cut silences first; use its edited video AND retimed transcript for cut-mistakes.
Review each mistake in context. Intentional repetition is not a mistake. Record
the reviewed decisions before applying them. If no cuts are needed, preserve the
input or use an empty cuts list. Never mix original timestamps with edited footage.
Cutting is not altering the voice: never denoise, EQ, compress, normalize, or
retime the speaker's audio, or regrade their footage, unless asked.

Every inserted visual must meet `.claude/skills/short-form-edit/references/broll-quality.md`.
Always stop for approval of two style frames, then of a visual storyboard
(`scripts/storyboard-sheet.mjs`), before building scenes; "make a reel" alone
does not approve them. After approval run `scripts/approve-storyboard.mjs`; a
project hook (`.claude/settings.json`) blocks scenes, renders, and paid video
generation until then. Style frames go in `video-projects/<slug>/style-frames/`.

Load the relevant skills before changing HTML. Root compositions use a visible
div with id, data-composition-id, data-start, duration, width, and height. Timed
elements carry data-start, data-duration, and data-track-index; same-track clips
must not overlap. Visible timed divs use class="clip"; videos do not.
Mute videos and use sibling audio for the mix. Animate a non-timed video wrapper.
Register one synchronous paused GSAP timeline per composition in window.__timelines
using its exact composition ID. Keep finite timelines and explicit durations.
HyperFrames owns media playback. Use deterministic animation and local assets.

## Verification and approvals

Run `node scripts/preflight.mjs <project>` and HyperFrames lint. For anchored
sub-compositions, run `node scripts/validate-beat-sync.mjs <project>`; each beat
needs data-anchor with an exact transcript phrase. Enter between 0.2 seconds after
and 1.8 seconds before that word. Inline timelines require manual timing review.

Review Studio before draft rendering. Review the encoded draft, extract and
inspect hero frames and transition boundaries, and listen to the audio joins.
Check cropped faces, overflow, black flashes, readable labels, clipping, and A/V
sync. Resolve problems before the final render. Save evidence in VERIFY.md.
Use a Range-capable preview server for MP4 scrubbing (for example `npx serve`).

Honor approvals already provided. When review approval is missing, prepare the
concrete preview or cut proposal first. Never claim a lint result proves visual
quality. Only publish or upload a finished video when the user authorizes it.
Automated browser checks must be headless, with Pointer Lock and cursor capture
disabled; synthetic input must remain inside the virtual browser.

For short-form edits, read `docs/SHORT-FORM.md` and use the plan and footage
validators. Structural checks supplement rendered video and audio review.
