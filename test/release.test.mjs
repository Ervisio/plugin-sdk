import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const cli = resolve('scripts/release.mjs');
function fixture(t, { dirty = false, remoteHead = 'a'.repeat(40), nested = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ervisio-release-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const cwd = nested ? join(dir, 'plugin') : dir;
  mkdirSync(join(cwd, 'plugin'), { recursive: true });
  mkdirSync(join(dir, '.github/workflows'), { recursive: true });
  mkdirSync(join(dir, 'bin'));
  writeFileSync(join(cwd, 'plugin/manifest.json'), JSON.stringify({ id: 'hello', version: '1.0.0' }));
  writeFileSync(join(dir, '.github/workflows', nested ? 'plugin-release.yml' : 'release.yml'), 'name: Release');
  const log = join(dir, 'calls.jsonl');
  const mock = `#!/usr/bin/env node\nconst fs = require('fs'); const args = process.argv.slice(2);\nfs.appendFileSync(${JSON.stringify(log)}, JSON.stringify([require('path').basename(process.argv[1]), ...args])+'\\n');\n`;
  writeFileSync(join(dir, 'bin/git'), mock + `if(args.includes('--show-toplevel'))console.log(${JSON.stringify(dir)});else if(args.includes('--porcelain'))console.log(${JSON.stringify(dirty ? ' M file' : '')});else console.log('${'a'.repeat(40)}');`, { mode: 0o755 });
  writeFileSync(join(dir, 'bin/gh'), mock + `if(args[0]==='repo')console.log(JSON.stringify({nameWithOwner:'Ervisio/plugin-hello',defaultBranchRef:{name:'main'}}));else if(args[0]==='api')console.log('${remoteHead}');`, { mode: 0o755 });
  return { dir, run: (...args) => spawnSync(process.execPath, [cli, ...args], { cwd, env: { ...process.env, PATH: join(dir, 'bin') + ':' + process.env.PATH }, encoding: 'utf8' }),
    calls: () => readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse) };
}

test('release dispatch preserves notes as one literal argument', t => {
  const f = fixture(t); const notes = 'Fix "quotes"; $(touch /tmp/do-not-run)\nSecond line';
  const p = f.run('minor', '--notes', notes);
  assert.equal(p.status, 0, p.stderr);
  assert.deepEqual(f.calls().at(-1), ['gh', 'workflow', 'run', 'release.yml', '--repo', 'Ervisio/plugin-hello', '--ref', 'main', '-f', 'bump=minor', '-f', `notes=${notes}`]);
});
test('uncommitted code is rejected before dispatch', t => {
  const f = fixture(t, { dirty: true }); const p = f.run('patch');
  assert.equal(p.status, 1); assert.match(p.stderr, /Commit and push/);
  assert.ok(!f.calls().some(c => c[1] === 'workflow'));
});
test('unpushed or stale checkout is rejected', t => {
  const f = fixture(t, { remoteHead: 'b'.repeat(40) }); const p = f.run('patch');
  assert.equal(p.status, 1); assert.match(p.stderr, /differs/);
  assert.ok(!f.calls().some(c => c[1] === 'workflow'));
});
test('embedded Drive layout selects its own workflow', t => {
  const f = fixture(t, { nested: true }); const p = f.run('patch');
  assert.equal(p.status, 0, p.stderr); assert.equal(f.calls().at(-1)[3], 'plugin-release.yml');
});
test('registration proposes source and first version in one workflow', t => {
  const f = fixture(t); const p = f.run('register', 'Web servers');
  assert.equal(p.status, 0, p.stderr);
  assert.deepEqual(f.calls().at(-1), ['gh', 'workflow', 'run', 'register.yml', '--repo', 'Ervisio/plugins', '--ref', 'main', '-f', 'id=hello', '-f', 'repo=Ervisio/plugin-hello', '-f', 'category=Web servers']);
});
test('unknown release arguments are rejected', t => {
  const f = fixture(t); assert.equal(f.run('patch', '--unknown').status, 1);
  assert.ok(!f.calls().some(c => c[1] === 'workflow'));
});
