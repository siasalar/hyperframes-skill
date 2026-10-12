#!/usr/bin/env node
// Record the user's approval of a project's storyboard. Run ONLY after the user
// has seen STORYBOARD.html and explicitly approved it (Claude Code asks the user
// to confirm this command). Editing storyboard.json afterwards voids the approval.
//
// Usage:
//   node scripts/approve-storyboard.mjs video-projects/<slug>
//   node scripts/approve-storyboard.mjs video-projects/<slug> --skip   (user asked to skip)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
if (!args[0] || args.includes('--help')) {
  console.log('Usage: node scripts/approve-storyboard.mjs video-projects/<slug> [--skip]');
  process.exit(args[0] ? 0 : 1);
}
const dir = resolve(args[0]);
const now = new Date().toISOString();

if (args.includes('--skip')) {
  writeFileSync(join(dir, 'STORYBOARD.skip.json'), JSON.stringify({ skippedAt: now, reason: 'user asked to skip the storyboard' }, null, 2) + '\n');
  console.log('Storyboard gate skipped at the user\'s request.');
  process.exit(0);
}
const sb = join(dir, 'storyboard.json');
if (!existsSync(sb)) { console.error(`No storyboard.json in ${dir}. Write it and build STORYBOARD.html first.`); process.exit(1); }
if (!existsSync(join(dir, 'STORYBOARD.html'))) { console.error('No STORYBOARD.html. Run scripts/storyboard-sheet.mjs and show it to the user first.'); process.exit(1); }
const sha = createHash('sha256').update(readFileSync(sb)).digest('hex');
writeFileSync(join(dir, 'STORYBOARD.approved.json'), JSON.stringify({ approvedAt: now, storyboardSha256: sha }, null, 2) + '\n');
console.log('Storyboard approved. Scene building and rendering are unlocked for this project.');
