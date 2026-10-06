#!/usr/bin/env node
// create-ervisio-plugin: a new plugin project from the template, ready to
// build, with the one-button Release workflow.
//
//   npm exec --yes --package=github:Ervisio/plugin-sdk -- create-ervisio-plugin <id> [options]
//
//   --name "Display name"      default: the id, capitalised
//   --description "..."        one line for the marketplace
//   --author "..."             default: git config user.name
//   --platforms linux,windows  where it works (default: linux)
//   --dir <folder>             default: plugin-<id>
//   --github <owner>           also create <owner>/plugin-<id> on GitHub and push (needs the gh CLI, logged in)
//
// It copies template/, fills in the id, names and platforms, runs git init
// with a first commit, and prints the next steps.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : def;
};
const fail = (msg) => {
  console.error(`create-ervisio-plugin: ${msg}`);
  process.exit(1);
};
const sh = (cmd, a, o = {}) => execFileSync(cmd, a, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', ...o }).trim();
const tryOut = (cmd, a) => {
  try {
    return sh(cmd, a);
  } catch {
    return '';
  }
};

const id = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
if (!id) fail('usage: create-ervisio-plugin <id> [--name "Name"] [--platforms linux,windows] [--github <owner>]');
if (!/^[a-z][a-z0-9-]{1,39}$/.test(id)) fail(`id "${id}" must be 2-40 lowercase letters, digits or dashes, starting with a letter`);
const name = opt('name', id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '));
const description = opt('description', `${name} for Ervisio.`);
const author = opt('author', tryOut('git', ['config', 'user.name']) || 'Your name');
const platforms = opt('platforms', 'linux').split(',').map((s) => s.trim()).filter(Boolean);
for (const p of platforms) if (p !== 'linux' && p !== 'windows') fail(`platform "${p}" is not linux or windows`);
const dir = resolve(opt('dir', `plugin-${id}`));
const owner = opt('github', '');
if (existsSync(dir)) fail(`${dir} exists already`);

const template = join(dirname(fileURLToPath(import.meta.url)), '..', 'template');
if (!existsSync(join(template, 'plugin', 'manifest.json'))) fail(`template not found at ${template}`);
cpSync(template, dir, { recursive: true, filter: (src) => !/[\\/](node_modules|dist)([\\/]|$)/.test(src) });
rmSync(join(dir, 'package-lock.json'), { force: true });

const edit = (rel, fn) => {
  const p = join(dir, rel);
  writeFileSync(p, fn(readFileSync(p, 'utf8')));
};
edit('plugin/manifest.json', (s) => {
  const m = JSON.parse(s);
  m.id = id;
  m.name = name;
  m.description = description;
  m.author = author;
  m.version = '0.1.0';
  m.contributes.pages = [{ ...(m.contributes.pages?.[0] ?? { icon: 'plugins' }), id, title: name }];
  if (platforms.length !== 1 || platforms[0] !== 'linux') {
    m.platforms = platforms;
    m.minCore = '0.6.1';
  }
  if (platforms.includes('windows') && !platforms.includes('linux')) {
    m.capabilities.commands = [
      { argv: ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', '(Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime | Select-Object -ExpandProperty TotalHours'], description: 'Hours since the last boot', name: 'uptime' },
    ];
  } else if (platforms.includes('windows')) {
    m.minCore = '0.6.2';
    m.capabilities.commands = [
      { ...m.capabilities.commands[0], platforms: ['linux'] },
      { argv: ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', '(Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime | Select-Object -ExpandProperty TotalHours'], description: 'Hours since the last boot', name: 'uptime', platforms: ['windows'] },
    ];
  }
  return JSON.stringify(m, null, 2) + '\n';
});
edit('package.json', (s) => {
  const p = JSON.parse(s);
  p.name = `ervisio-plugin-${id}`;
  p.version = '0.1.0';
  return JSON.stringify(p, null, 2) + '\n';
});
edit('vite.config.ts', (s) => s.replaceAll('hello', id));
edit('src/index.ts', (s) => s.replace("registerPage('hello'", `registerPage('${id}'`).replace("title: 'Hello'", `title: ${JSON.stringify(name)}`));
edit('README.md', (s) => s.replace('# Hello, an Ervisio plugin', `# ${name}, an Ervisio plugin`).replaceAll('dist/hello', `dist/${id}`).replaceAll('hello-<version>', `${id}-<version>`));
writeFileSync(join(dir, 'CHANGELOG.md'), `# Changelog\n\n## 0.1.0\n\n- First version.\n`);

sh('git', ['init', '-q', '-b', 'main'], { cwd: dir });
sh('git', ['add', '-A'], { cwd: dir });
const ident = tryOut('git', ['config', 'user.email']) ? [] : ['-c', 'user.name=Ervisio plugin', '-c', 'user.email=plugin@localhost'];
sh('git', [...ident, 'commit', '-q', '-m', `${name}: first version`], { cwd: dir });
console.log(`Created ${dir}`);

if (owner) {
  const repo = `${owner}/plugin-${id}`;
  try {
    execFileSync('gh', ['repo', 'create', repo, '--public', '--source', dir, '--push', '--description', description], { stdio: 'inherit' });
    console.log(`Pushed to https://github.com/${repo}`);
  } catch {
    fail(`could not create ${repo} with gh (is it installed and logged in?). The project is ready in ${dir}.`);
  }
}

console.log(`
Next:
  cd ${dir}
  npm install
  npm run build          # dist/${id}/: load it from Ervisio > Plugins > Developer
${owner ? '' : `  gh repo create <owner>/plugin-${id} --public --source . --push\n`}
Release: on GitHub, Actions > Release > Run workflow (patch / minor / major).
Marketplace: the first time, add the plugin to registry.json in Ervisio/plugins
  {"id": "${id}", "repo": "${owner || '<owner>'}/plugin-${id}", "trust": "team", "category": "..."}
after that every release is picked up by itself.`);
