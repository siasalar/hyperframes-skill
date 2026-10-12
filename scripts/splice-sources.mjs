#!/usr/bin/env node
// Join several source recordings into one, in a chosen order, and build ONE
// word-level transcript on the joined timeline. Run this BEFORE cut-silences;
// every later step then works on a single source as usual.
//
// Usage:
//   node scripts/splice-sources.mjs <plan.json> [--out-dir dir] [--apply]
//
// plan.json:
//   {
//     "output": "combined.mp4",                       // optional, relative to out-dir
//     "segments": [
//       { "label": "insert", "video": "raw/clip-2.mp4", "transcript": "raw/clip-2.json", "start": 0.40, "end": 6.10 },
//       { "label": "main",   "video": "raw/clip-1.mp4", "transcript": "raw/clip-1.json", "start": 0.00 }
//     ]
//   }
// Paths are relative to the plan file. start/end are seconds on that source's own
// timeline; omit start for 0 and end for the full transcript duration. Pick
// boundaries in the gaps between words (use the transcripts' word times).
//
// Writes to out-dir (default: the plan's folder):
//   <stem>.json             combined transcript { text, audio_duration_secs, words, segments }
//   <stem>.splice-review.md join points with the words around them, for user approval
// Without --apply it prints the ffmpeg command; with --apply it renders the video.
// Boundaries snap into the gap between words, keeping the speaker's own natural
// pause (median sentence gap) at each join; set "snap": false to disable.
// Video is scaled/padded to the first segment's size and frame rate. Audio is only
// resampled to 48 kHz stereo with a 15 ms fade at each join to prevent clicks;
// no denoise, EQ, or loudness change.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join, basename, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
if (!args.length || args.includes('--help')) {
  console.log('Usage: node scripts/splice-sources.mjs <plan.json> [--out-dir dir] [--apply]');
  process.exit(args.length ? 0 : 1);
}
const die = (m) => { console.error(m); process.exit(1); };
const planPath = resolve(args[0]);
const outIdx = args.indexOf('--out-dir');
const apply = args.includes('--apply');
const planDir = dirname(planPath);
const outDir = outIdx >= 0 ? resolve(args[outIdx + 1]) : planDir;
mkdirSync(outDir, { recursive: true });

const plan = JSON.parse(readFileSync(planPath, 'utf8'));
if (!Array.isArray(plan.segments) || !plan.segments.length) die('plan.segments must be a non-empty array');
const output = resolve(outDir, plan.output || 'combined.mp4');
const stem = basename(output, extname(output));
const r3 = (n) => Math.round(n * 1000) / 1000;

const warnings = [];
const words = [];
const segOut = [];
let offset = 0;

function loadWords(tPath) {
  const t = JSON.parse(readFileSync(tPath, 'utf8'));
  const list = (t.words || [])
    .filter((w) => (w.type ? w.type === 'word' : true))
    .map((w) => ({ text: String(w.text ?? w.word ?? '').trim(), start: Number(w.start), end: Number(w.end) }))
    .filter((w) => w.text && Number.isFinite(w.start) && Number.isFinite(w.end));
  return { list, duration: Number(t.audio_duration_secs) || (list.length ? list.at(-1).end : 0) };
}

// The speaker's own pause between phrases, used to size every join so the
// rhythm does not stumble. Median of gaps between 0.25 and 1.5 s.
const gaps = [];
for (const seg of plan.segments) {
  const tPath = resolve(planDir, seg.transcript || '');
  if (!seg.transcript || !existsSync(tPath)) continue;
  const { list } = loadWords(tPath);
  for (let i = 1; i < list.length; i++) {
    const g = list[i].start - list[i - 1].end;
    if (g >= 0.25 && g <= 1.5) gaps.push(g);
  }
}
gaps.sort((a, b) => a - b);
const naturalPause = Math.min(0.7, Math.max(0.25, gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0.4));
const headPad = 0.4 * naturalPause;
const tailPad = 0.6 * naturalPause;
const snapAll = plan.snap !== false;

function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'json', file], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  const s = JSON.parse(r.stdout).streams?.[0];
  if (!s) return null;
  const [n, d] = s.r_frame_rate.split('/').map(Number);
  return { width: s.width, height: s.height, fps: d ? n / d : n };
}

const firstVideo = resolve(planDir, plan.segments[0].video || '');
const target = existsSync(firstVideo) ? probe(firstVideo) : null;
const FPS = target ? Math.round(target.fps * 1000) / 1000 : null;
// Cut points sit on the output frame grid so every segment's video and audio
// have exactly the same length; otherwise concat pads audio and drifts A/V.
const onGrid = (t) => (FPS ? Math.round(t * FPS) / FPS : t);
const FADE = 0.015;

plan.segments.forEach((seg, i) => {
  const label = seg.label || `segment-${i + 1}`;
  if (!seg.video || !seg.transcript) die(`${label}: video and transcript are required`);
  const video = resolve(planDir, seg.video);
  const tPath = resolve(planDir, seg.transcript);
  if (!existsSync(tPath)) die(`${label}: transcript not found: ${tPath}`);
  const { list: srcWords, duration } = loadWords(tPath);
  let start = seg.start ?? 0;
  let end = seg.end ?? duration;
  if (!(end > start)) die(`${label}: end (${end}) must be greater than start (${start})`);
  const snapped = [];
  if (snapAll && seg.snap !== false && srcWords.length) {
    // Leave the speaker's natural breath on each side of a join, staying inside the gap.
    const first = srcWords.find((w) => w.start >= start - 1e-3);
    if (first) {
      const prevEnd = srcWords.filter((w) => w.end <= first.start + 1e-3 && w !== first).at(-1)?.end ?? 0;
      const ns = Math.max(prevEnd, first.start - headPad, 0);
      if (Math.abs(ns - start) > 0.01) { snapped.push(`start ${r3(start)} -> ${r3(ns)} s`); start = ns; }
    }
    const last = [...srcWords].reverse().find((w) => w.end <= end + 1e-3);
    if (last) {
      const nextStart = srcWords.find((w) => w.start >= last.end - 1e-3 && w !== last)?.start ?? duration;
      const ne = Math.min(nextStart, last.end + tailPad, duration || Infinity);
      if (Math.abs(ne - end) > 0.01) { snapped.push(`end ${r3(end)} -> ${r3(ne)} s`); end = ne; }
    }
  }
  start = onGrid(start);
  end = Math.min(onGrid(end), duration ? onGrid(Math.floor(duration * (FPS || 1000)) / (FPS || 1000)) : Infinity);
  if (!(end > start)) die(`${label}: segment is shorter than one frame`);

  for (const w of srcWords) {
    const inside = w.start >= start - 1e-3 && w.end <= end + 1e-3;
    const straddles = w.start < end && w.end > start && !inside;
    if (straddles) warnings.push(`${label}: boundary cuts through the word "${w.text}" (${w.start}-${w.end}s). Move the boundary into a gap.`);
    if (inside) words.push({ text: w.text, start: r3(w.start - start + offset), end: r3(w.end - start + offset), segment: label });
  }
  const before = srcWords.filter((w) => w.end <= start + 1e-3).slice(-6).map((w) => w.text).join(' ');
  const firstIn = srcWords.filter((w) => w.start >= start - 1e-3 && w.end <= end + 1e-3);
  const after = srcWords.filter((w) => w.start >= end - 1e-3).slice(0, 6).map((w) => w.text).join(' ');
  segOut.push({
    label, video, start: r3(start), end: r3(end), offset: r3(offset), length: r3(end - start), snapped,
    firstWords: firstIn.slice(0, 8).map((w) => w.text).join(' '),
    lastWords: firstIn.slice(-8).map((w) => w.text).join(' '),
    droppedBefore: before, droppedAfter: after,
  });
  offset += end - start;
});

const combined = {
  text: words.map((w) => w.text).join(' '),
  audio_duration_secs: r3(offset),
  words: words.map(({ text, start, end }) => ({ text, start, end })),
  segments: segOut.map(({ label, video, start, end, offset: o, length }) => ({ label, source: video, sourceStart: start, sourceEnd: end, offset: o, length })),
};
const transcriptOut = join(outDir, `${stem}.json`);
writeFileSync(transcriptOut, JSON.stringify(combined, null, 2) + '\n');

const md = [`# Splice review: ${basename(output)}`, '', `Total length: ${r3(offset)} s`,
  `Natural pause used at joins: ${r3(naturalPause)} s (from the speaker's own sentence gaps)${snapAll ? '' : ' (snapping off)'}`, ''];
segOut.forEach((s, i) => {
  md.push(`## ${i + 1}. ${s.label} (${basename(s.video)} ${s.start}-${s.end} s, placed at ${s.offset} s)`);
  if (s.droppedBefore) md.push(`- Left out just before: "... ${s.droppedBefore}"`);
  md.push(`- Starts: "${s.firstWords} ..."`);
  md.push(`- Ends: "... ${s.lastWords}"`);
  if (s.droppedAfter) md.push(`- Left out just after: "${s.droppedAfter} ..."`);
  if (s.snapped.length) md.push(`- Boundaries adjusted to keep a natural breath: ${s.snapped.join(', ')}`);
  md.push('');
});
const reviewOut = join(outDir, `${stem}.splice-review.md`);

const videos = [...new Set(segOut.map((s) => s.video))];
let ffArgs = null;
if (target) {
  const { width: W, height: H } = target;
  const fps = FPS;
  for (const v of videos.slice(1)) {
    const p = existsSync(v) ? probe(v) : null;
    if (p && p.width * H !== p.height * W) warnings.push(`${basename(v)} is ${p.width}x${p.height}, a different shape from ${W}x${H}; it will be letterboxed. Consider reframing it first.`);
  }
  const graph = segOut.map((s, i) => {
    const k = videos.indexOf(s.video);
    return `[${k}:v]fps=${fps},trim=start=${s.start}:end=${s.end},setpts=PTS-STARTPTS,scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}];` +
      `[${k}:a]atrim=start=${s.start}:end=${s.end},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,` +
      `afade=t=in:st=0:d=${FADE},afade=t=out:st=${r3(Math.max(0, s.length - FADE))}:d=${FADE}[a${i}]`;
  });
  graph.push(`${segOut.map((_, i) => `[v${i}][a${i}]`).join('')}concat=n=${segOut.length}:v=1:a=1[v][a]`);
  const graphPath = join(outDir, `${stem}.splice-filter.txt`);
  writeFileSync(graphPath, graph.join(';\n'));
  ffArgs = ['-y', '-hide_banner', '-loglevel', 'error', ...videos.flatMap((v) => ['-i', v]), '-/filter_complex', graphPath, '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', output];
} else {
  warnings.push('ffprobe could not read the first video, so no render command was built.');
}
if (warnings.length) md.push('## Warnings', '', ...warnings.map((w) => `- ${w}`), '');
writeFileSync(reviewOut, md.join('\n'));

console.log(`Combined transcript: ${transcriptOut} (${words.length} words, ${r3(offset)} s)`);
console.log(`Review for the user: ${reviewOut}`);
warnings.forEach((w) => console.warn(`WARNING: ${w}`));
if (ffArgs && !apply) console.log(`Render with --apply, or run:\nffmpeg ${ffArgs.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')}`);
if (ffArgs && apply) {
  const ff = spawnSync('ffmpeg', ffArgs, { stdio: ['ignore', 'ignore', 'inherit'] });
  if (ff.status !== 0) die(`ffmpeg failed (status ${ff.status})`);
  console.log(`Rendered ${output}`);
}
if (apply && !ffArgs) process.exit(1);
