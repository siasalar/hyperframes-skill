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
or `OPENAI_API_KEY` (report only "set" or "empty"), and whether local
faster-whisper can run (`python3 scripts/transcribe-faster-whisper.py --check`).

## 2. Report in one short message

Use the user's language. Example:

> I checked your services:
> - Higgsfield: connected (Plus, 1,200 credits). Used for generated images and video.
> - ElevenLabs: connected. Used for transcription and sound effects.
> - Kie.ai: not set up. Optional.
> - Local transcription: this computer can run it for free.
>
> Nothing else is needed. If you want another service, connect it in
> Claude → Settings → Connectors and start a new session.

For anything missing, say what it would add and that it is optional. Only when a
user has no connector for a service and explicitly prefers an API key, open
`.env` for them and say which line to fill. Do not ask them to paste keys into chat.

## 3. Use the connector, verify the output

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
