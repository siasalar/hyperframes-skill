import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const hook = join(root, 'scripts/hooks/storyboard-gate.mjs');

function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'hf-gate-'));
  mkdirSync(join(dir, 'video-projects', 'reel', 'style-frames'), { recursive: true });
  return dir;
}
function decide(dir, payload) {
  const r = spawnSync(process.execPath, [hook], { input: JSON.stringify({ cwd: dir, ...payload }), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout ? JSON.parse(r.stdout).hookSpecificOutput?.permissionDecision : 'allow';
}

test('storyboard gate blocks scenes and renders until the user approves', () => {
  const dir = setup();
  const comp = { tool_name: 'Write', tool_input: { file_path: join(dir, 'video-projects/reel/compositions/s01.html') } };
  const render = { tool_name: 'Bash', tool_input: { command: 'cd video-projects/reel && npx hyperframes render --output renders/final.mp4' } };
  assert.equal(decide(dir, comp), 'deny');
  assert.equal(decide(dir, render), 'deny');
  assert.equal(decide(dir, { tool_name: 'Write', tool_input: { file_path: join(dir, 'video-projects/reel/style-frames/index.html') } }), 'allow');
  assert.equal(decide(dir, { tool_name: 'Write', tool_input: { file_path: join(dir, 'video-projects/reel/STORYBOARD.approved.json') } }), 'deny');
  assert.equal(decide(dir, { tool_name: 'Bash', tool_input: { command: 'node scripts/approve-storyboard.mjs video-projects/reel' } }), 'ask');
  assert.equal(decide(dir, { tool_name: 'mcp__x__generate_video', tool_input: { params: { model: 'kling3_0' } } }), 'deny');
  assert.equal(decide(dir, { tool_name: 'mcp__x__generate_video', tool_input: { params: { model: 'kling3_0', get_cost: true } } }), 'allow');

  const project = join(dir, 'video-projects/reel');
  writeFileSync(join(project, 'storyboard.json'), JSON.stringify({ scenes: [{ id: 's1', start: 0, end: 1, layout: 'speaker' }] }));
  writeFileSync(join(project, 'STORYBOARD.html'), '<html></html>');
  const ok = spawnSync(process.execPath, [join(root, 'scripts/approve-storyboard.mjs'), project], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(decide(dir, comp), 'allow');
  assert.equal(decide(dir, render), 'allow');

  writeFileSync(join(project, 'storyboard.json'), JSON.stringify({ scenes: [] }));
  assert.equal(decide(dir, comp), 'deny');
});

test('demo project is never gated', () => {
  const dir = setup();
  mkdirSync(join(dir, 'video-projects/demo'), { recursive: true });
  assert.equal(decide(dir, { tool_name: 'Write', tool_input: { file_path: join(dir, 'video-projects/demo/index.html') } }), 'allow');
});
