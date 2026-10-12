import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const fixture = join(root, 'examples/editing/source.json');
function run(script, args) { return spawnSync(process.execPath, [join(root, script), ...args], { encoding: 'utf8', cwd: root }); }
function scratch() { return mkdtempSync(join(tmpdir(), 'hyperframes-kit-test-')); }
const apply = '.agents/skills/cut-mistakes/scripts/apply-cuts.mjs';

test('silence edit preserves speech and produces shorter, ordered timestamps', () => {
  const out = scratch();
  const result = run('.agents/skills/cut-silences/scripts/cut-silences.mjs', [fixture, '--out-dir', out]);
  assert.equal(result.status, 0, result.stderr);
  const doc = JSON.parse(readFileSync(join(out, 'source.silence-transcript.json')));
  assert.equal(doc.words.map(w => w.text).join(' '), 'We we build a small garden. Plants need light.');
  assert.ok(doc.audio_duration_secs < 6 && doc.audio_duration_secs > 3);
  assert.ok(doc.words.every((w, i) => w.end > w.start && (!i || w.start >= doc.words[i-1].end)));
});

test('reviewed stutter cut drops only the first word and retimes the next word', () => {
  const out = scratch();
  const result = run(apply, [fixture, '--cuts', join(root, 'examples/editing/approved-cuts.json'), '--out-dir', out]);
  assert.equal(result.status, 0, result.stderr);
  const doc = JSON.parse(readFileSync(join(out, 'source.mistakes-transcript.json')));
  assert.equal(doc.audio_duration_secs, 7.71);
  assert.equal(doc.words[0].text, 'we');
  assert.equal(doc.words[0].start, .61);
  assert.equal(doc.words.at(-1).text, 'light.');
});

test('a review with zero mistakes is a valid identity edit', () => {
  const out = scratch(), cuts = join(out, 'cuts.json');
  writeFileSync(cuts, '{"cuts":[]}');
  const result = run(apply, [fixture, '--cuts', cuts, '--out-dir', out]);
  assert.equal(result.status, 0, result.stderr);
  const doc = JSON.parse(readFileSync(join(out, 'source.mistakes-transcript.json')));
  assert.equal(doc.audio_duration_secs, 8);
  assert.equal(doc.words.length, 9);
  assert.equal(doc.words[0].start, .6);
});

test('out-of-source cuts fail instead of corrupting the edit timeline', () => {
  const out = scratch(), cuts = join(out, 'cuts.json');
  writeFileSync(cuts, '{"cuts":[{"start":-1,"end":9}]}');
  const result = run(apply, [fixture, '--cuts', cuts, '--out-dir', out]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /range|duration|bounds/i);
});

test('beat validator accepts reordered attributes and enforces early and late limits', () => {
  const out = scratch(); mkdirSync(join(out, 'assets')); mkdirSync(join(out, 'compositions'));
  writeFileSync(join(out, 'assets/transcript.json'), '{"words":[{"text":"Hello","start":2.5,"end":2.8}]}');
  writeFileSync(join(out, 'compositions/beat.html'), '<div data-anchor="Hello"></div>');
  for (const [start, expected] of [[2,0],[0,1],[3,1]]) {
    writeFileSync(join(out, 'index.html'), `<div data-duration="1" data-start="${start}" id="intro-card" data-composition-src="compositions/beat.html"></div>`);
    const result = run('scripts/validate-beat-sync.mjs', [out, '--json']);
    assert.equal(result.status, expected, result.stderr);
    assert.equal(JSON.parse(result.stdout).rows.length, 1);
  }
});

test('splicing two sources offsets the second transcript and reports joins', () => {
  const out = scratch();
  const plan = join(out, 'plan.json');
  writeFileSync(plan, JSON.stringify({ output: 'combined.mp4', snap: false, segments: [
    { label: 'intro', video: 'missing-a.mp4', transcript: fixture, start: 0, end: 1.0 },
    { label: 'insert', video: 'missing-b.mp4', transcript: fixture, start: 2.0, end: 4.0 },
  ] }));
  const result = run('scripts/splice-sources.mjs', [plan, '--out-dir', out]);
  assert.equal(result.status, 0, result.stderr);
  const doc = JSON.parse(readFileSync(join(out, 'combined.json')));
  assert.equal(doc.audio_duration_secs, 3);
  assert.equal(doc.segments[1].offset, 1);
  assert.ok(doc.words.every((w, i) => w.end > w.start && (!i || w.start >= doc.words[i-1].start)));
  assert.ok(doc.words.every(w => w.end <= 3 + 1e-6));
  assert.match(readFileSync(join(out, 'combined.splice-review.md'), 'utf8'), /placed at 1 s/);
});

test('splice snapping keeps a natural pause at the join and never cuts a word', () => {
  const out = scratch();
  const plan = join(out, 'plan.json');
  const words = JSON.parse(readFileSync(fixture)).words.filter(w => (w.type ? w.type === 'word' : true));
  let mid = 1;
  for (let i = 1; i < words.length; i++) if (words[i].start - words[i-1].end > words[mid].start - words[mid-1].end) mid = i;
  const gap = words[mid].start - words[mid - 1].end;
  const cut = (words[mid - 1].end + words[mid].start) / 2;
  writeFileSync(plan, JSON.stringify({ segments: [
    { label: 'a', video: 'x.mp4', transcript: fixture, start: 0, end: cut },
    { label: 'b', video: 'x.mp4', transcript: fixture, start: cut },
  ] }));
  const result = run('scripts/splice-sources.mjs', [plan, '--out-dir', out]);
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /cuts through the word/);
  const doc = JSON.parse(readFileSync(join(out, 'combined.json')));
  const j = doc.segments[1].offset;
  const before = doc.words.filter(w => w.end <= j + 1e-6).at(-1);
  const after = doc.words.find(w => w.start >= j - 1e-6);
  const pause = after.start - before.end;
  assert.ok(pause <= gap + 1e-6, `join pause ${pause} exceeds the real gap ${gap}`);
  assert.ok(pause >= Math.min(gap, 0.25) - 1e-6 && pause <= 0.7 + 1e-6, `join pause ${pause} (gap ${gap})`);
  assert.match(readFileSync(join(out, 'combined.splice-review.md'), 'utf8'), /Natural pause used at joins/);
});

test('storyboard sheet renders every scene with Persian labels', () => {
  const out = scratch();
  const sb = join(out, 'storyboard.json');
  writeFileSync(sb, JSON.stringify({ title: 'ریلز آزمایشی', scenes: [
    { id: 's01', start: 0, end: 2, layout: 'speaker', spoken: 'سلام' },
    { id: 's02', start: 2, end: 5, layout: 'pip', spoken: 'این مرحله اول است', onScreen: 'نمودار' },
  ] }));
  const result = run('scripts/storyboard-sheet.mjs', [sb]);
  assert.equal(result.status, 0, result.stderr);
  const html = readFileSync(join(out, 'STORYBOARD.html'), 'utf8');
  assert.match(html, /dir="rtl"/);
  assert.equal((html.match(/class="card"/g) || []).length, 2);
  assert.match(html, /روی صفحه/);
});
