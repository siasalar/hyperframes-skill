# Analyze a short-form reference

Use a reference the student supplies and has permission to use. Keep the recording
and analysis inside the private video project. Do not copy its script or assets.

## Watch and record

Watch the full video once for its promise and payoff, then again with timestamps.
For each meaningful change, record:

| Time | Spoken idea | Visual change | Sound cue | Viewer question | Payoff |
| --- | --- | --- | --- | --- | --- |
| Fill from the supplied reference | Verbatim phrase | Framing, footage, or graphic | Audible impact | What remains unresolved | Where it resolves |

Measure the actual resolution, duration, and frame rate. Separate observations
from your interpretation of why a choice works. A fast montage does not imply
that every new edit needs the same number of cuts.

## Measure the look

The user should not have to describe the reference. Extract its visual system
from the frames and write it as numbers, so the edit can reproduce the feel
without copying content. Use contact sheets, full-size frames at several
timestamps, and `ffmpeg -vf "select='gt(scene,0.3)',showinfo"` for cut times.

Record in a `Reference spec` section of `REFERENCE-ANALYSIS.md`:

- **Layout modes** and their share of runtime: speaker full-frame, speaker in a
  card or window beside graphics (picture-in-picture), split screen, full-screen
  graphic, B-roll. Note which mode opens and closes the video.
- **Speaker framing** per mode: face height as a percentage of frame height,
  eye-line position, crop (head-and-shoulders, chest-up), and for a card its
  size and position in pixels at 1080x1920, corner radius, border, shadow, and
  whether it moves.
- **Graphic area**: where explanatory graphics sit, how much of the frame they
  fill, background (color, grid, texture, blur), and depth treatment.
- **Transitions** between modes: type (morph, slide, scale, cut, wipe),
  approximate duration, easing feel.
- **Pacing**: average shot length, cuts per 10 s, how long full-screen graphics hold.
- **Captions and text**: position, size relative to frame width, weight, case,
  words per group, highlight method, safe-zone margins actually used.
- **Palette and type**: sampled hex values for background, text, and accents;
  font category and weight (identify the face only when confident).
- **Motion character**: speed, easing (snappy, smooth, springy), how elements
  enter, and how much idle motion remains on screen.
- **Sound**: music presence and level against the voice, SFX density, and what they mark.

Show the user a short summary of this spec before the style frames. Precedence
for every choice: the user's explicit brief, then this reference spec, then the
skill defaults and `broll-quality.md`. Never copy the reference's script, logo,
brand assets, footage, or exact graphics; reproduce its measured system with new
content from this recording. If the reference itself breaks the B-roll quality
bar (generic icons, slide layouts), keep its layout and pacing but not those elements.

## Transfer the mechanism

- Make the opening visual support a truthful promise in the spoken hook.
- Use a brief crop or caption emphasis on a specific word, then return to rest.
- Cut to moving footage when it supplies evidence or explains something concrete.
- Give each sound cue a visible event; align its audible impact, not its file start.
- Build curiosity that the retained recording actually resolves.
- End after the payoff with enough room for the intended action to be understood.

Write which mechanisms fit this recording and which would distract from it.
Design new copy, scenes, and motion from the student's own transcript and brief.
