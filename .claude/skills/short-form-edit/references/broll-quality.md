# B-roll and motion-graphics quality bar

Applies to every inserted visual: HTML motion graphics, library cards, and
AI-generated footage, in reels and long-form edits alike. The user's brief sets
palette, background, and layout; these rules set the quality floor. When a rule
conflicts with an explicit user instruction, follow the user and note it.

## Banned

- Generic stock symbols: gears, light bulbs, rockets, brains, robots, magnifying
  glasses, checkmark-in-circle, globe-with-network, padlocks, as stand-ins for an idea.
- Emoji, clip art, stock icon packs used as content, cartoon or childish shapes.
- Slide-deck layouts: a title plus bullet list, three equal boxes with icons,
  numbered lists that just repeat the narration.
- Rainbow or default purple-to-pink gradients, heavy dark drop shadows, thick
  outlines, bevelled "word-art" text, fake chrome, neon glow on everything.
- Springy, bouncy, or elastic easing on serious content; spin, wobble, or zoom
  with no editorial reason; uniform idle bobbing on every element.
- Placeholder content: lorem ipsum, fake logos, invented UI, made-up statistics.

## Required

1. **Show the mechanism, not a symbol.** Each insert shows how the spoken idea
   actually works: the real steps, the real data flow, the before and after.
   When a tool, app, or website is mentioned, rebuild its real interface in HTML
   (or capture it) instead of a blank rectangle labelled with its name.
2. **One focal point at a time.** One element carries the meaning in each
   moment; everything else is dimmed, blurred, or absent. If two things compete,
   split them into two beats.
3. **One visual world for the whole video.** Fix the grid, card material,
   corner radius, shadow, line weight, type scale, and 2-3 accent colors in
   `DESIGN.md` before building, and reuse them in every scene. Scenes evolve that
   world (the same card moves, splits, transforms); they never restart with a new
   design. Keep a callback object that returns at the payoff.
4. **Depth.** Separate foreground, subject, and background layers. Use subtle
   perspective, parallax, background blur behind glass cards, and soft contact
   shadows that match one light direction.
5. **Motion quality.** Entrances 0.4-0.8 s with ease-out (`power3.out`,
   `expo.out`); exits faster than entrances. Stagger by meaning, bound to the
   spoken word, never a fixed `index * 0.1`. No element sits completely static
   for more than about 2 s: keep a slow drift, a progress fill, a cursor, or a
   light sweep. Transitions transform an existing object instead of cutting to a
   new slide.
6. **Minimal on-screen text.** Key words or numbers only, never the full
   sentence the speaker is saying. Step-by-step processes show one large, clearly
   legible step at a time, with the current step highlighted.
7. **Language and type.** Use a proper font for the script (Vazirmatn for
   Persian, loaded from a local file in the project), set `dir="rtl"` for RTL text,
   and check that letters join correctly in the rendered frame.

## The speaker is a design element

"Do not change the speaker" means their voice, color, and light. It does not
mean the footage must sit in a fixed rectangle. Treat the speaker video as the
most important object in the visual world and design with it:

- **Shapes:** circle, rounded card, pill, or a window inside a graphic (a phone
  screen, a node in a diagram, a slot in a dashboard). Animate the mask itself:
  full frame shrinking into a circle, a circle growing back to full frame.
- **Travel:** the same speaker card moves between positions and sizes across
  scenes instead of popping in and out, so the viewer always knows where they are.
- **Rhythm:** punch-ins (about 1.08-1.15x) and position changes land on stressed
  words, never on a random beat.
- **Framing inside a mask:** eyes in the upper third of the shape, the full face
  and chin inside it, and the mask edge never cutting through the mouth or eyes.
  Check this on every frame of a move, not only at rest.
- **Depth:** a soft shadow, a thin bright border, or a glow behind the card
  separates the speaker from the graphics.

Plan at least two speaker treatments per reel and record them in the storyboard.

## Joins between recordings and takes

Where two recordings or two separated takes meet, the viewer must not see a jump
or feel the rhythm stumble:

- Keep the speaker's natural pause at the join (the splice script sizes it from
  their own sentence gaps); never butt two sentences together or leave dead air.
- Hide the visual jump: land the join on a layout change (speaker to full-screen
  graphic, full frame to circle, card moving) or a punch-in, so the two shots are
  never shown in the same framing back to back.
- Let a graphic or the music carry across the join so motion and sound continue
  through it, and check the join frame by frame and by ear in the draft.

## Invent signature moments yourself

The user should not have to script creative ideas. Read the transcript, infer
its tone (explainer, story, opinion, tutorial) and its core idea, then invent
visuals that grow out of what is said.

- For the hook and each key idea, write three different visual concepts in the
  storyboard and pick the strongest; say why in one line. Reject any concept that
  could illustrate a different video.
- Every reel gets at least one **signature transition** that connects generated
  footage, graphics, and the real speaker into one continuous move.
- Build concepts from the content's own objects and actions. Example: a video
  about recording each video four times could open on a real-looking camera,
  push into its viewfinder where four takes play side by side, and land on the
  speaker as the "best take" fills the screen.

Technique vocabulary (pick by meaning, never as a checklist):

- **Land on the speaker (end frame).** Extract the speaker frame at the cut point
  (`ffmpeg -ss <t> -i cut.mp4 -frames:v 1 land.png`), upload it, and generate
  with it as the **end frame** (Higgsfield `kling3_0` or `seedance_2_0` with
  `medias` role `end_image`; Kie Kling image-to-video with a tail image when
  supported). The generated move finishes exactly on the real shot; cut or blend
  2-4 frames into the real footage at that frame.
- **Launch from the speaker (start frame).** The same trick reversed: the real
  frame is `start_image` and the shot transforms out into the next idea.
- **Zoom through a frame.** A screen, viewfinder, window, or phone inside a
  generated or HTML shot holds the speaker video (masked and perspective-fit in
  HyperFrames); the camera pushes in until it fills the frame.
- **Match cut** on shape, motion direction, or color between generated footage,
  graphics, and the speaker.
- **Object carry-over:** an object from a generated shot becomes the graphic in
  the next scene, or the speaker card becomes an object in the generated scene.

Rules: generated frames may show the speaker only with that user's consent, only
briefly, and only as a transition into or out of their real footage; never put
words in their mouth. Conform generated 24 fps clips to the edit's frame rate and
check the landing frame side by side with the real frame before approving.

## AI-generated footage

- Use it for physical, real-world, or cinematic shots that HTML cannot produce.
  Never for diagrams, UI, charts, or any shot that must contain readable text.
- Generate only on the approved account (`docs/GENERATION-ACCOUNTS.md`).
- Inspect the selected interval frame by frame at full size: garbled text, extra
  fingers, warped faces, fake logos, morphing objects, flicker. Reframe, trim, or
  regenerate; never ship a defect because it is brief.
- It must have genuine motion, match the video's color and light, and never
  depict a synthetic person as a real, named person.

## Style frames before the storyboard

Before writing the storyboard, render 2 still style frames from real
HyperFrames compositions at the delivery resolution: one speaker-plus-graphic
layout and one full-screen graphic, using real content from this video. When a
reference video is supplied, build them from its measured `Reference spec`
(layout, framing, card size, palette, type) unless the brief says otherwise. Show them to the user and wait for approval of the look. Build
every scene in that approved style. If the user rejects the look, revise the
frames, not the storyboard.

## Self-check before showing a draft

Look at each scene's key frame at phone size and answer honestly:

- Could this frame appear in any generic AI video? Then it fails rule 1.
- Is there exactly one obvious place to look?
- Does it look like the same video as the previous scene?
- Is any banned element present?

Fix failures before asking for review.
