#!/usr/bin/env node
// Claude Code hook: no scene building, final rendering, or paid video generation
// for a project until the user has approved its storyboard.
//
// Wired in .claude/settings.json for PreToolUse and SessionStart. Reads the hook
// JSON on stdin and prints a decision. Approval lives in
// video-projects/<slug>/STORYBOARD.approved.json, written only by
// scripts/approve-storyboard.mjs, which this hook routes through a user prompt.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.CLAUDE_PROJECT_DIR ? resolve(process.env.CLAUDE_PROJECT_DIR) : resolve(fileURLToPath(new URL('../..', import.meta.url)));
const PROJECTS = join(ROOT, 'video-projects');
const EXEMPT = new Set(['demo']);

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* no input */ }

const out = (obj) => { process.stdout.write(JSON.stringify(obj)); process.exit(0); };
const pre = (decision, reason) => out({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason } });

if (input.hook_event_name === 'SessionStart') {
  out({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext:
    'hyperframes-skill: for every video edit, the user must approve a visual storyboard BEFORE scenes are built. ' +
    'Order: service check, transcription and cuts, two style frames, then storyboard.json -> `node scripts/storyboard-sheet.mjs <file> --open`, ' +
    'show STORYBOARD.html, and wait. After the user explicitly approves, run `node scripts/approve-storyboard.mjs video-projects/<slug>`. ' +
    'A hook blocks writing compositions/, the root index.html, final renders, and paid video generation until then. "Make a reel" is not approval.' } });
}

function storyboardHash(dir) {
  const f = join(dir, 'storyboard.json');
  return existsSync(f) ? createHash('sha256').update(readFileSync(f)).digest('hex') : null;
}

function status(dir) {
  if (existsSync(join(dir, 'STORYBOARD.skip.json'))) return 'ok';
  const marker = join(dir, 'STORYBOARD.approved.json');
  if (!existsSync(marker)) return 'missing';
  try {
    const m = JSON.parse(readFileSync(marker, 'utf8'));
    return m.storyboardSha256 && m.storyboardSha256 === storyboardHash(dir) ? 'ok' : 'changed';
  } catch { return 'missing'; }
}

function projectOf(p) {
  if (!p) return null;
  const abs = resolve(input.cwd || ROOT, p);
  const rel = relative(PROJECTS, abs);
  if (!rel || rel.startsWith('..') || resolve(PROJECTS, rel) !== abs) return null;
  const [slug, ...rest] = rel.split(sep);
  if (!slug || EXEMPT.has(slug)) return null;
  return { slug, dir: join(PROJECTS, slug), inner: rest.join('/') };
}

function block(project, what) {
  const st = status(project.dir);
  if (st === 'ok') process.exit(0);
  const why = st === 'changed'
    ? `The storyboard for "${project.slug}" changed after it was approved.`
    : `The storyboard for "${project.slug}" has not been approved by the user yet.`;
  pre('deny', `${why} Blocked: ${what}. ` +
    'Write video-projects/' + project.slug + '/storyboard.json, run `node scripts/storyboard-sheet.mjs video-projects/' + project.slug + '/storyboard.json --open`, ' +
    'show the user STORYBOARD.html and a short scene list, and stop. After the user explicitly approves, run ' +
    '`node scripts/approve-storyboard.mjs video-projects/' + project.slug + '`. Only if the user explicitly says to skip the storyboard, add `--skip`.');
}

const tool = input.tool_name || '';
const ti = input.tool_input || {};

// 1. Approving (or skipping) the storyboard always goes through the user.
if ((tool === 'Bash' || tool === 'PowerShell') && /approve-storyboard\.mjs/.test(ti.command || '')) {
  pre('ask', 'Storyboard approval: confirm only if the user has seen STORYBOARD.html and approved it (or asked to skip it).');
}

// 2. The approval files can only be written by the approve script.
if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(tool)) {
  const p = projectOf(ti.file_path || ti.notebook_path);
  if (p && /^STORYBOARD\.(approved|skip)\.json$/.test(p.inner)) {
    pre('deny', 'Approval files are created only by `node scripts/approve-storyboard.mjs` after the user approves.');
  }
  if (p && (p.inner.startsWith('compositions/') || p.inner === 'index.html')) block(p, `writing ${p.inner}`);
  process.exit(0);
}

// 3. Final renders and shell writes into compositions.
if (tool === 'Bash' || tool === 'PowerShell') {
  const cmd = ti.command || '';
  if (/STORYBOARD\.(approved|skip)\.json/.test(cmd) && !/approve-storyboard\.mjs/.test(cmd) && /(>|\btee\b|\bcp\b|\bmv\b|\btouch\b|writeFile)/.test(cmd)) {
    pre('deny', 'Approval files are created only by `node scripts/approve-storyboard.mjs` after the user approves.');
  }
  const paths = [...cmd.matchAll(/video-projects[\\/]+([A-Za-z0-9._-]+)/g)].map((m) => `video-projects/${m[1]}`);
  if (input.cwd) paths.push(input.cwd);
  const projects = paths.map(projectOf).filter(Boolean);
  const isRender = /hyperframes(\.cmd)?\s+render\b/.test(cmd) && !/style-frames/.test(cmd);
  const writesScenes = /video-projects[\\/]+[A-Za-z0-9._-]+[\\/]+(compositions[\\/]|index\.html)/.test(cmd) && /(>|\btee\b|\bcp\b|\bmv\b|\bsed\s+-i|writeFile)/.test(cmd);
  if (isRender || writesScenes) {
    const p = projects[0];
    if (p) block(p, isRender ? 'rendering the video' : 'writing scene files');
  }
  process.exit(0);
}

// 4. Paid video generation (cost preflights are always allowed).
if (/generate_video/.test(tool)) {
  const params = typeof ti.params === 'object' && ti.params ? ti.params : {};
  if (params.get_cost === true) process.exit(0);
  if (!existsSync(PROJECTS)) process.exit(0);
  const latest = readdirSync(PROJECTS)
    .filter((d) => !EXEMPT.has(d) && statSync(join(PROJECTS, d)).isDirectory())
    .map((d) => ({ slug: d, dir: join(PROJECTS, d), t: statSync(join(PROJECTS, d)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0];
  if (latest) block({ ...latest, inner: '' }, 'paid video generation');
}
process.exit(0);
