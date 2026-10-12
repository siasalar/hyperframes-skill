# Choose the generation account first

Run this check once per project, at the start of any workflow that may generate
images, video, music, or voice (`edit-video`, `short-form-edit`, `make-a-video`,
`motion-showreel`, `website-to-hyperframes`, `hyperframes-video-beats`). Do it
before planning paid assets, not halfway through a build. A workflow that only
cuts and animates local media does not need it.

## 1. Higgsfield first

Look for a connected Higgsfield integration: an MCP connector whose tools
include `balance`, `generate_image`, and `generate_video` (in Claude Code these
appear as `mcp__…Higgsfield__…`).

- **Connected.** Call `balance` and tell the user, in their language, something like:

  > Your Higgsfield account is connected (plan: Plus, 1,200 credits). I'll use this
  > account for generated images and video in this project. Do you approve?

  Wait for an explicit answer. Do not generate anything before it.
- **Not connected.** Ask whether the user has a Higgsfield account. If yes, tell
  them to connect the Higgsfield connector (claude.ai Settings → Connectors, or
  their client's MCP settings) and start a new session, then repeat this check.
  If they have no account or do not want to connect it, go to step 2.

## 2. If Higgsfield is declined or unavailable

Move to the user's other accounts, in this order, and confirm the choice the same way:

1. **Kie.ai**, if `KIE_API_KEY` is set in `.env` (see
   [TOOLS-AND-API-KEYS.md](TOOLS-AND-API-KEYS.md)).
2. Any other generation service the user names and has configured.
3. **No generation:** use the user's footage, supplied assets, and pure
   HyperFrames motion graphics. This is always a valid path.

Never fall back to another paid account silently. If the approved account fails
(no credits, missing model, error), stop and ask before switching.

## 3. Record the decision

Write the approved provider into the project's plan or brief (for example a
`Generation account:` line in `BRIEF.md`, `PLAN.md`, or `BRAND.md`) so later
steps and later sessions reuse it instead of asking again. Ask again only if the
user changes their mind or the account stops working.

## 4. Before each paid generation

- **Higgsfield:** preflight with `get_cost: true` on `generate_image` /
  `generate_video` (no job is submitted) and include the credit cost in the
  proposal. Pass `use_unlim: true` only when the user asks to use unlimited
  generations.
- **Kie.ai:** state the model and expected credits from Kie's current pricing.
- Group the proposed assets with their total cost and get one approval for the
  batch. Reuse finished jobs; never resubmit after a timeout until the first
  job's outcome is known.

Model availability differs between services (for example, a model may exist on
one and not the other). If the approved account lacks the model a shot needs,
propose the closest model on that account first, then ask before using another
account.
