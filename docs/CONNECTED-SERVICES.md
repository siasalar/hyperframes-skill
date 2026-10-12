# Check connected services first

Many users are not programmers. They connect services through their assistant's
**connectors** (claude.ai Settings → Connectors, also used by the Claude desktop
app and Claude Code) instead of API keys. Never open with "put your keys in
`.env`". Run this check right after installing the kit and at the start of any
edit, and reuse the result for the rest of the session.

## 1. Detect

Look at the tools available in this session (do not print any secret):

| Service | Connected when you see tools like | Used for |
| --- | --- | --- |
| Higgsfield | `balance`, `generate_image`, `generate_video` from a Higgsfield connector | Generated images, video, music; offered first (see [GENERATION-ACCOUNTS.md](GENERATION-ACCOUNTS.md)) |
| ElevenLabs | speech-to-text, text-to-speech, or sound-effect tools from an ElevenLabs connector | Transcription, voice, SFX |
| Other connectors | any other media-generation or transcription connector | As the user chooses |

Also check whether `.env` contains a non-empty `ELEVENLABS_API_KEY`, `KIE_API_KEY`,
or `OPENAI_API_KEY` (report only "set" or "empty").

**Computer check, with permission.** Before running anything on the user's
hardware, ask once: "May I check your computer's memory and graphics card to see
whether it can transcribe locally? This only reads system info." If they agree,
run `python3 scripts/transcribe-faster-whisper.py --check` (no install, read-only).
If they decline, treat local processing as unavailable and offer only online options.

## 2. Report in one short message

Use the user's language. Example:

> I checked your services:
> - Higgsfield: connected (Plus, 1,200 credits). Used for generated images and video.
> - ElevenLabs: connected. Used for transcription and sound effects.
> - Kie.ai: not set up. Optional.
> - This computer: 8 GB RAM, no graphics card.
>
> For transcription you can choose:
> 1. Online with ElevenLabs (connected): fastest and most accurate for Persian;
>    uses your ElevenLabs plan.
> 2. On this computer: free, but it will keep the processor busy and take longer
>    (roughly several minutes per minute of video on this machine).
>
> Which one do you want?

## 3. Let the user choose where heavy work runs

Never pick silently between paid online processing and the user's own hardware.
Offer the options that actually exist, each with its trade-off, recommend one,
and wait for the choice; record it in the project's plan and reuse it.

- **Transcription:** reuse an existing matching transcript without asking.
  Otherwise offer the connected or keyed online service (cost: their plan or
  credits) and local faster-whisper (free; uses CPU or GPU; slow on weak
  laptops). Recommend online when `--check` reports under 8 GB RAM and no NVIDIA
  GPU, or when the language is not English and the machine is weak.
- **Local device:** use the graphics card only when `--check` found an NVIDIA GPU
  and the user agreed to local processing; otherwise run on the CPU
  (`--device cpu`). Never install GPU drivers or CUDA.
- **Rendering** always runs locally in Chrome and works without a graphics card.
  On a weak machine, render drafts at `--quality draft` and say the final render
  may take a while.

For anything missing, say what it would add and that it is optional. Only when a
user has no connector for a service and explicitly prefers an API key, open
`.env` for them and say which line to fill. Do not ask them to paste keys into chat.

## 4. Use the connector, verify the output

- **Transcription through a connector.** Call its speech-to-text tool with the
  spoken language set (for example `fa`). Save the raw response in the project.
  The kit needs word-level start and end times; normalize the response into the
  format in [TOOLS-AND-API-KEYS.md](TOOLS-AND-API-KEYS.md). If the connector
  returns only plain text or sentence segments, say so and fall back to local
  faster-whisper (or the ElevenLabs API key if set). Never invent word times.
- **Generation through a connector.** Follow
  [GENERATION-ACCOUNTS.md](GENERATION-ACCOUNTS.md): ask before using the
  connected account and preflight costs.
- **Sound effects or voice through a connector.** Ask before paid calls, save the
  files into the project's `assets/`, and record what produced them.

Bundled scripts such as `transcribe-elevenlabs.mjs`, `kie.mjs`, and `sfx.mjs` are
the API-key route. With a connector, use the connector's tools instead; do not
ask for a key just because a script exists.
