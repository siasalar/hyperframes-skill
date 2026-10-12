#!/usr/bin/env node
// Build a visual storyboard page for user approval BEFORE any scene is built.
//
// Usage:
//   node scripts/storyboard-sheet.mjs <storyboard.json> [--open]
//
// storyboard.json (paths relative to this file):
//   {
//     "title": "Reel about X",
//     "format": "9:16 · 1080x1920",
//     "video": "edits/clean-cut.mp4",          // edited video, for speaker thumbnails
//     "styleFrames": ["frames/style-pip.png", "frames/style-full.png"],
//     "scenes": [
//       { "id": "s01", "start": 0, "end": 3.2, "layout": "speaker",
//         "spoken": "the exact words said in this scene",
//         "onScreen": "what appears on screen", "motion": "how it moves",
//         "visual": "html | generated | source footage", "image": "frames/s01.png" }
//     ]
//   }
// layout: speaker | pip | fullscreen | split | broll
// "image" is optional (a rough frame of the scene); without it the page draws
// a layout diagram using a frame from "video".
//
// Writes STORYBOARD.html (and storyboard-thumbs/) next to the JSON.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
if (!args.length || args.includes('--help')) {
  console.log('Usage: node scripts/storyboard-sheet.mjs <storyboard.json> [--open]');
  process.exit(args.length ? 0 : 1);
}
const file = resolve(args[0]);
const dir = dirname(file);
const sb = JSON.parse(readFileSync(file, 'utf8'));
if (!Array.isArray(sb.scenes) || !sb.scenes.length) { console.error('scenes must be a non-empty array'); process.exit(1); }

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (t) => { const s = Number(t) || 0; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };
const fa = sb.lang ? sb.lang === 'fa' : /[\u0600-\u06FF]/.test(sb.title || '');
const L = fa ? {
  layouts: { speaker: 'گوینده تمام صفحه', pip: 'کارت گوینده کنار انیمیشن', fullscreen: 'انیمیشن تمام صفحه', split: 'دو تکه: گوینده و انیمیشن', broll: 'بی رول' },
  onScreen: 'روی صفحه:', motion: 'حرکت:', visual: 'ساخته شده با:', scenes: 'صحنه', footer: 'همه صحنه ها را ببینید. تایید کنید یا شماره صحنه هایی که باید عوض شوند را بگویید.',
} : {
  layouts: { speaker: 'Speaker full screen', pip: 'Speaker card + graphic', fullscreen: 'Full-screen graphic', split: 'Split: speaker + graphic', broll: 'B-roll footage' },
  onScreen: 'On screen:', motion: 'Motion:', visual: 'Made with:', scenes: 'scenes', footer: 'Review every scene. Reply with approval or with the scene numbers to change.',
};
const LAYOUTS = L.layouts;

const thumbsDir = join(dir, 'storyboard-thumbs');
const video = sb.video ? resolve(dir, sb.video) : null;
const canThumb = video && existsSync(video) && spawnSync('ffmpeg', ['-version'], { windowsHide: true }).status === 0;
if (canThumb) mkdirSync(thumbsDir, { recursive: true });

function thumb(scene) {
  if (!canThumb) return null;
  const t = (Number(scene.start) + Number(scene.end)) / 2;
  const out = join(thumbsDir, `${scene.id}.jpg`);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', video, '-frames:v', '1', '-vf', 'scale=360:-2', '-q:v', '4', out], { windowsHide: true });
  return r.status === 0 && existsSync(out) ? relative(dir, out).split('\\').join('/') : null;
}

function diagram(scene, speakerImg) {
  const sp = speakerImg ? `<img src="${esc(speakerImg)}" alt="">` : '<span>speaker</span>';
  const gfx = `<div class="gfx"><span>${esc(scene.onScreen || 'graphic')}</span></div>`;
  switch (scene.layout) {
    case 'speaker': return `<div class="phone"><div class="speaker full">${sp}</div></div>`;
    case 'pip': return `<div class="phone">${gfx}<div class="speaker pip">${sp}</div></div>`;
    case 'split': return `<div class="phone split">${gfx}<div class="speaker half">${sp}</div></div>`;
    case 'broll': return `<div class="phone"><div class="gfx broll"><span>${esc(scene.onScreen || 'footage')}</span></div></div>`;
    default: return `<div class="phone">${gfx}</div>`;
  }
}

const total = Math.max(...sb.scenes.map((s) => Number(s.end) || 0));
const counts = {};
sb.scenes.forEach((s) => { counts[s.layout] = (counts[s.layout] || 0) + (Number(s.end) - Number(s.start)); });

const cards = sb.scenes.map((s, i) => {
  const img = s.image && existsSync(resolve(dir, s.image)) ? s.image : null;
  const speakerImg = thumb(s);
  const visual = img ? `<div class="phone"><img class="frame" src="${esc(img)}" alt=""></div>` : diagram(s, speakerImg);
  return `<article class="card">
  <div class="vis">${visual}</div>
  <div class="meta">
    <div class="top"><b>${i + 1}</b><span class="time">${fmt(s.start)} – ${fmt(s.end)} · ${(Number(s.end) - Number(s.start)).toFixed(1)}s</span></div>
    <div class="tag t-${esc(s.layout)}">${esc(LAYOUTS[s.layout] || s.layout)}</div>
    ${s.spoken ? `<p class="spoken" dir="auto">“${esc(s.spoken)}”</p>` : ''}
    ${s.onScreen ? `<p dir="auto"><em>${L.onScreen}</em> ${esc(s.onScreen)}</p>` : ''}
    ${s.motion ? `<p dir="auto"><em>${L.motion}</em> ${esc(s.motion)}</p>` : ''}
    ${s.visual ? `<p dir="auto"><em>${L.visual}</em> ${esc(s.visual)}</p>` : ''}
    ${s.note ? `<p class="note" dir="auto">${esc(s.note)}</p>` : ''}
  </div>
</article>`;
}).join('\n');

const styles = (sb.styleFrames || []).filter((f) => existsSync(resolve(dir, f)))
  .map((f) => `<img src="${esc(f)}" alt="style frame">`).join('');
const mix = Object.entries(counts).map(([k, v]) => `${esc(LAYOUTS[k] || k)} ${Math.round((v / total) * 100)}%`).join(' · ');

const html = `<!doctype html><html${fa ? ' dir="rtl" lang="fa"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Storyboard</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#f6f7fb;--card:#fff;--ink:#16181d;--mute:#6b7280;--line:#e5e7ef;--acc:#4f46e5;--acc2:#0ea5a4}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 Vazirmatn,system-ui,sans-serif}
header{padding:28px 24px 8px;max-width:1200px;margin:auto}h1{margin:0 0 4px;font-size:26px}
.sub{color:var(--mute)}.styles{display:flex;gap:12px;margin:16px 0 4px;flex-wrap:wrap}
.styles img{height:260px;border-radius:14px;box-shadow:0 6px 24px #0001}
main{max-width:1200px;margin:auto;padding:16px 24px 48px;display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;display:flex;gap:14px}
.vis{flex:0 0 112px}.phone{position:relative;width:112px;aspect-ratio:9/16;border-radius:12px;overflow:hidden;background:#eef0f7;border:1px solid var(--line)}
.phone img{width:100%;height:100%;object-fit:cover;display:block}.frame{width:100%}
.gfx{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:8px;text-align:center;font-size:10px;color:var(--acc);
background:linear-gradient(#fff,#eef0ff),repeating-linear-gradient(0deg,#0000 0 11px,#4f46e512 11px 12px)}
.gfx.broll{background:#1f2937;color:#e5e7eb}.speaker{position:absolute;overflow:hidden;background:#cbd5e1;display:flex;align-items:center;justify-content:center;font-size:10px}
.speaker.full{inset:0}.speaker.pip{width:46%;aspect-ratio:3/4;right:6px;bottom:22px;border-radius:8px;border:2px solid #fff;box-shadow:0 4px 12px #0003}
.split .gfx{bottom:50%}.speaker.half{left:0;right:0;bottom:0;height:50%}
.meta{flex:1;min-width:0}.top{display:flex;gap:8px;align-items:baseline}.top b{font-size:18px}.time{color:var(--mute);font-size:13px}
.tag{display:inline-block;margin:6px 0;padding:2px 10px;border-radius:99px;font-size:12px;background:#eef2ff;color:var(--acc)}
.t-fullscreen{background:#ecfeff;color:var(--acc2)}.t-speaker{background:#f3f4f6;color:#374151}.t-broll{background:#1f2937;color:#fff}
.meta p{margin:4px 0;font-size:13px}.spoken{font-weight:600}.meta em{color:var(--mute);font-style:normal}.note{color:#b45309}
footer{max-width:1200px;margin:auto;padding:0 24px 40px;color:var(--mute)}
</style></head><body>
<header><h1 dir="auto">${esc(sb.title || 'Storyboard')}</h1>
<div class="sub">${esc(sb.format || '')} · ${sb.scenes.length} ${L.scenes} · ${total.toFixed(1)}s · ${mix}</div>
${styles ? `<div class="styles">${styles}</div>` : ''}</header>
<main>${cards}</main>
<footer>${L.footer}</footer>
</body></html>`;

const out = join(dir, 'STORYBOARD.html');
writeFileSync(out, html);
console.log(`Storyboard: ${out}`);
if (!canThumb && sb.video) console.warn('WARNING: could not extract speaker thumbnails (video or ffmpeg missing).');
if (args.includes('--open')) {
  const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', out]] : process.platform === 'darwin' ? ['open', [out]] : ['xdg-open', [out]];
  spawnSync(cmd[0], cmd[1], { stdio: 'ignore', windowsHide: true });
}
