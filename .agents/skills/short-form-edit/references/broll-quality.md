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
layout and one full-screen graphic, using the brief's palette and real content
from this video. Show them to the user and wait for approval of the look. Build
every scene in that approved style. If the user rejects the look, revise the
frames, not the storyboard.

## Self-check before showing a draft

Look at each scene's key frame at phone size and answer honestly:

- Could this frame appear in any generic AI video? Then it fails rule 1.
- Is there exactly one obvious place to look?
- Does it look like the same video as the previous scene?
- Is any banned element present?

Fix failures before asking for review.
