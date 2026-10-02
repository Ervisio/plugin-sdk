/**
 * A minimal Ervisio plugin: one page that shows the output of `uptime`, a command declared in plugin/manifest.json.
 * Store the SDK and React first: everything else reads them through getSdk() and the `react` shim.
 */
import { createElement as h, useEffect, useState } from 'react';
import { setReact } from '@ervisio/plugin-sdk/react';
import { getSdk, setSdk, type PluginSDK } from '@ervisio/plugin-sdk';

function Hello() {
  const sdk = getSdk();
  const { Page, Card, Button } = sdk.ui;
  const [out, setOut] = useState('');
  const [err, setErr] = useState('');

  const load = () => {
    setErr('');
    sdk.api
      .exec('uptime')
      .then((r) => setOut(r.stdout.trim()))
      .catch((e: Error) => setErr(e.message));
  };
  useEffect(load, []);

  return h(
    Page,
    { title: sdk.t('title'), hue: 'plg' },
    h(Card, null, h('p', { style: { fontFamily: 'var(--mono, monospace)' } }, err || out || sdk.t('loading'))),
    h(Button, { onClick: load }, sdk.t('refresh')),
  );
}

export default function activate(sdk: PluginSDK): void {
  setSdk(sdk);
  setReact(sdk.react);
  sdk.registerStrings({
    en: { title: 'Hello', loading: 'Loading...', refresh: 'Refresh' },
    it: { title: 'Ciao', loading: 'Caricamento...', refresh: 'Aggiorna' },
  });
  sdk.registerPage('hello', Hello);
}
