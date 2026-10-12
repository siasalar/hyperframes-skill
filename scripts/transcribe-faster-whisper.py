#!/usr/bin/env python3
"""Local transcription with faster-whisper -> the kit's word-level JSON.

Free and offline after the one-time model download. Picks a model that fits the
machine unless --model is given. Run --check first: it needs no install and
prints the hardware, the recommended model, and whether faster-whisper exists.

Usage:
  python3 scripts/transcribe-faster-whisper.py --check
  python3 scripts/transcribe-faster-whisper.py <input> [--language fa] [--model auto]
                                               [--output path] [--device auto]

Install (ask the user first; the model downloads on first run):
  python3 -m pip install --user faster-whisper

Output: { text, audio_duration_secs, language, model, words: [{text,start,end}] }
with times in seconds on the source timeline, as docs/TOOLS-AND-API-KEYS.md requires.
"""
import argparse
import json
import os
import platform
import shutil
import subprocess
import sys

# Approximate RAM needed with int8 on CPU; download size in parentheses.
MODELS = {
    "large-v3": "best accuracy, slow on CPU (~3 GB RAM, ~3 GB download)",
    "large-v3-turbo": "near large-v3 accuracy, much faster (~2 GB RAM, ~1.6 GB download)",
    "medium": "good accuracy (~1.5 GB RAM, ~1.5 GB download)",
    "small": "weak for Persian and other low-resource languages (~0.6 GB RAM, ~0.5 GB download)",
    "base": "drafts only (~0.3 GB RAM, ~0.15 GB download)",
}


def total_ram_gb():
    try:
        if sys.platform == "darwin":
            out = subprocess.run(["sysctl", "-n", "hw.memsize"], capture_output=True, text=True).stdout
            return int(out.strip()) / 1024 ** 3
        if sys.platform.startswith("linux"):
            with open("/proc/meminfo") as f:
                for line in f:
                    if line.startswith("MemTotal:"):
                        return int(line.split()[1]) / 1024 ** 2
        if sys.platform == "win32":
            import ctypes

            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong),
                            ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
                            ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
                            ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong),
                            ("ullAvailExtendedVirtual", ctypes.c_ulonglong)]
            stat = MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
            return stat.ullTotalPhys / 1024 ** 3
    except Exception:
        pass
    return None


def has_cuda():
    if not shutil.which("nvidia-smi"):
        return False
    return subprocess.run(["nvidia-smi"], capture_output=True).returncode == 0


def recommend(ram, cuda):
    if cuda:
        return "large-v3", "cuda", "float16"
    if ram is None or ram >= 8:
        return "large-v3-turbo", "cpu", "int8"
    if ram >= 4:
        return "small", "cpu", "int8"
    return "base", "cpu", "int8"


def faster_whisper_installed():
    try:
        import faster_whisper  # noqa: F401
        return True
    except ImportError:
        return False


def check():
    ram = total_ram_gb()
    cuda = has_cuda()
    model, device, compute = recommend(ram, cuda)
    report = {
        "os": f"{platform.system()} {platform.machine()}",
        "python": platform.python_version(),
        "ram_gb": round(ram, 1) if ram else None,
        "nvidia_gpu": cuda,
        "faster_whisper_installed": faster_whisper_installed(),
        "ffmpeg": bool(shutil.which("ffmpeg") and shutil.which("ffprobe")),
        "recommended_model": model,
        "device": device,
        "compute_type": compute,
        "note": MODELS[model],
    }
    if model in ("small", "base"):
        report["advice"] = ("This machine is weak for accurate local transcription. Prefer a cloud "
                            "provider (ElevenLabs Scribe or OpenAI) for Persian or other non-English speech.")
    print(json.dumps(report, indent=2))


def duration_secs(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=nw=1:nk=1", path], capture_output=True, text=True).stdout
    try:
        return float(out.strip())
    except ValueError:
        return None


def transcribe(args):
    if not faster_whisper_installed():
        sys.exit("faster-whisper is not installed. Ask the user, then run: "
                 "python3 -m pip install --user faster-whisper")
    from faster_whisper import WhisperModel

    model_name, device, compute = recommend(total_ram_gb(), has_cuda())
    if args.model != "auto":
        model_name = args.model
    if args.device != "auto":
        device = args.device
        compute = "float16" if device == "cuda" else "int8"

    src = os.path.abspath(args.input)
    if not os.path.exists(src):
        sys.exit(f"Input not found: {src}")
    out = args.output or os.path.splitext(src)[0] + ".json"

    print(f"Model {model_name} on {device} ({compute}); first run downloads the model.", file=sys.stderr)
    try:
        model = WhisperModel(model_name, device=device, compute_type=compute)
    except Exception as exc:  # missing CUDA/cuDNN libraries and similar
        if device != "cuda":
            raise
        print(f"GPU unavailable ({exc}); falling back to CPU.", file=sys.stderr)
        device, compute = "cpu", "int8"
        model = WhisperModel(model_name, device=device, compute_type=compute)
    segments, info = model.transcribe(
        src,
        language=None if args.language == "auto" else args.language,
        word_timestamps=True,
        vad_filter=False,
        beam_size=5,
    )
    words, texts = [], []
    for seg in segments:
        texts.append(seg.text.strip())
        for w in seg.words or []:
            t = w.word.strip()
            if t:
                words.append({"text": t, "start": round(w.start, 3), "end": round(w.end, 3)})
        print(f"  {seg.end:7.1f}s", file=sys.stderr, end="\r")

    result = {
        "text": " ".join(texts),
        "audio_duration_secs": duration_secs(src) or info.duration,
        "language": info.language,
        "model": f"faster-whisper/{model_name}",
        "words": words,
    }
    with open(out, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"\nWrote {len(words)} words to {out}", file=sys.stderr)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("input", nargs="?")
    p.add_argument("--check", action="store_true", help="print hardware and the recommended model, then exit")
    p.add_argument("--language", default="auto", help="ISO code such as fa or en (default: auto-detect)")
    p.add_argument("--model", default="auto", choices=["auto"] + list(MODELS))
    p.add_argument("--device", default="auto", choices=["auto", "cpu", "cuda"])
    p.add_argument("--output")
    args = p.parse_args()
    if args.check:
        return check()
    if not args.input:
        p.error("input is required unless --check is given")
    transcribe(args)


if __name__ == "__main__":
    main()
