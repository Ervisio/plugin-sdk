import test from 'node:test';
import assert from 'node:assert/strict';
import { getSdk, setSdk, SDK_VERSION } from '../index.js';

test('contract v4 passes shell context through without replacing the host SDK', async () => {
  const commands = [];
  const sdk = { version: 4, shell: { mode: 'ervisios', async command(text) { commands.push(text); return { handled: true, message: 'Opening Files.' }; } } };
  setSdk(sdk);
  assert.equal(SDK_VERSION, 5);
  assert.equal(getSdk(), sdk);
  assert.equal(getSdk().shell.mode, 'ervisios');
  assert.deepEqual(await getSdk().shell.command('Open Files'), { handled: true, message: 'Opening Files.' });
  assert.deepEqual(commands, ['Open Files']);
});

test('legacy SDK objects remain usable with optional shell feature detection', () => {
  const legacy = { version: 3, platform: 'linux' };
  setSdk(legacy);
  assert.equal(getSdk(), legacy);
  assert.equal(getSdk().shell?.mode, undefined);
  assert.equal(getSdk().data, undefined);
  assert.equal(getSdk().files?.pick, undefined);
});
