#!/usr/bin/env node
// ervisio-plugin-pack: copies a plugin's static files next to its bundle and
// makes the release tarball.
//
//   ervisio-plugin-pack copy   copy plugin/* into dist/<id>/ (after vite build)
//   ervisio-plugin-pack pack   write dist/<id>-<version>.tar.gz and .sha256
//
// Options: --src <dir> (default "plugin"), --dist <dir> (default "dist").
// Checks: manifest.json is valid JSON with an id and a version equal to
// package.json's version (and to $TAG without its leading "v" when TAG is
// set); the release folder holds no "files" key, no manifest.sig, and only
// regular files and folders. The tarball has one top folder <id>/ and is
// reproducible (GNU tar --sort=name, fixed owner and mtime, gzip -n).
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i > 0 && args[i + 1] ? args[i + 1] : def;
};
const SRC = opt('src', 'plugin');
const DIST = opt('dist', 'dist');

function fail(msg) {
  console.error(`ervisio-plugin-pack: ${msg}`);
  process.exit(1);
}

function readJSON(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    fail(`${p}: ${e.message}`);
  }
}

function manifest() {
  const m = readJSON(join(SRC, 'manifest.json'));
  if (!/^[a-z][a-z0-9-]{1,39}$/.test(m.id ?? '')) fail(`manifest id "${m.id}" must match ^[a-z][a-z0-9-]{1,39}$`);
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(m.version ?? '')) fail(`manifest version "${m.version}" is not a semantic version`);
  if ('files' in m) fail('plugin/manifest.json must not carry "files": the registry adds it when it signs the plugin');
  if (existsSync('package.json')) {
    const pkg = readJSON('package.json');
    if (pkg.version !== m.version) fail(`package.json version ${pkg.version} differs from manifest version ${m.version}`);
  }
  const tag = process.env.TAG;
  if (tag && tag.replace(/^v/, '') !== m.version) fail(`tag ${tag} differs from manifest version ${m.version}`);
  return m;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = lstatSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (st.isFile()) out.push(p);
    else fail(`${p} is a link or special file; a plugin may hold only regular files and folders`);
  }
  return out;
}

const m = manifest();
const out = join(DIST, m.id);

if (cmd === 'copy') {
  cpSync(SRC, out, { recursive: true, dereference: false, errorOnExist: false, force: true });
  console.log(`copied ${SRC}/ into ${out}/`);
} else if (cmd === 'pack') {
  if (!existsSync(join(out, m.entry ?? 'index.js'))) fail(`${out}/${m.entry ?? 'index.js'} is missing: run the build first`);
  if (existsSync(join(out, 'manifest.sig'))) fail(`${out}/manifest.sig must not be shipped: the registry signs the plugin`);
  const built = readJSON(join(out, 'manifest.json'));
  if (JSON.stringify(built) !== JSON.stringify(m)) fail(`${out}/manifest.json differs from ${SRC}/manifest.json: run the copy step again`);
  walk(out);
  let mtime = process.env.SOURCE_DATE_EPOCH;
  if (!mtime) {
    try {
      mtime = execFileSync('git', ['log', '-1', '--format=%ct'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      mtime = '0';
    }
  }
  const name = `${m.id}-${m.version}.tar.gz`;
  const file = join(DIST, name);
  rmSync(file, { force: true });
  const tar = execFileSync(
    'tar',
    ['--sort=name', '--owner=0', '--group=0', '--numeric-owner', `--mtime=@${mtime}`, '--format=gnu', '-C', DIST, '-cf', '-', m.id],
    { maxBuffer: 256 << 20 },
  );
  const gz = execFileSync('gzip', ['-n', '-9'], { input: tar, maxBuffer: 256 << 20 });
  writeFileSync(file, gz);
  const sum = createHash('sha256').update(gz).digest('hex');
  writeFileSync(`${file}.sha256`, `${sum}  ${name}\n`);
  console.log(`${file}\n${sum}  ${name}`);
} else {
  console.error('usage: ervisio-plugin-pack copy|pack [--src plugin] [--dist dist]');
  process.exit(2);
}
