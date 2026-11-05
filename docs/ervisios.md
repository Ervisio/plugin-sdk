# Native ErvisiOS plugin pages

Ervisio 0.7.0 and later includes ErvisiOS, which opens every existing plugin page as an application. A plugin without native metadata keeps its existing page, commands, permissions and sandbox in a desktop window. SDK 0.4.0 describes contract version 4.

To provide a native desktop layout, keep the public page ID and declare an alternate registered view:

```json
{
  "minCore": "0.7.0",
  "contributes": {
    "pages": [
      {
        "id": "containers",
        "title": "Containers",
        "icon": "box",
        "ervisios": { "view": "containers-desktop" }
      }
    ]
  }
}
```

Register both views from the same module. Share data hooks and action handlers so capabilities and authorization stay identical:

```ts
export default function activate(sdk: PluginSDK) {
  setSdk(sdk);
  setReact(sdk.react);
  sdk.registerPage('containers', Containers);
  sdk.registerPage('containers-desktop', DesktopContainers);
}
```

The classic console renders `containers`; ErvisiOS renders `containers-desktop`. Links, `sdk.open('containers')`, app shortcuts and virtual folders continue to use the public page ID. The alternate view is not a separate menu entry. A missing native metadata field uses the normal view automatically.

Contract version 4 exposes `sdk.shell?.mode` (`classic` or `ervisios`) and the same value on `sdk.view.shell`. The runtime also sets `document.documentElement.dataset.shell`, so CSS can use `[data-shell="ervisios"]`. Set `minCore: "0.7.0"` on manifests containing native metadata. Older consoles omit these SDK features and reject the unknown manifest field; keep older published plugin releases available for those consoles. Classic mode in Ervisio 0.7.0 still renders the normal registered view from the same native-capable package.

Native layout guidelines:

- Size to the frame, using flex containers with `min-width: 0` and `min-height: 0`; do not use viewport-width layouts.
- Leave window chrome, taskbar and desktop management to ErvisiOS.
- Use `sdk.theme`, `sdk.lang()` and the shared `--bg`, `--surface`, `--sunk`, `--ink`, `--ink2` and section colour tokens.
- Keep loading, empty, error and disconnected states, keyboard focus and reduced motion support.
- Use existing `sdk.api` and file capabilities. Native views have the same opaque-origin iframe and broker permissions as classic views.

The first-party AI plugin can call `sdk.shell?.command(text)` before contacting its provider. This resolves strict local UI requests such as opening an app or changing theme and returns `{handled, message}`. Unknown requests return `{handled:false}` and continue through the existing AI provider. This API does not execute operating-system commands, access files or grant administrator rights. Other plugin IDs are refused by the host broker.

## Minimized window lifecycle

Minimizing keeps the frame and its state mounted. The runtime marks it hidden, pauses repeating browser timers and animation frames, and resumes them when the window is restored. A hidden browser tab has the same effect. Pending requests, one-shot timers, promises and saves may finish; minimizing does not cancel an operation or stop a server service.

Use the optional `sdk.visibility` API to pause additional subscriptions or workers that need explicit control. `hidden` is a live getter; read it when starting optional work rather than copying it at activation time. `onChange` returns an unsubscribe function and does not call the listener immediately:

```ts
const stop = sdk.visibility?.onChange((hidden) => {
  if (hidden) pauseLiveUpdates();
  else resumeLiveUpdates();
});
if (!sdk.visibility?.hidden) resumeLiveUpdates();
// During view cleanup:
stop?.();
```

Older consoles omit this API. Keep optional chaining, preserve unsaved state, and clean up subscriptions when a view closes. Native views and classic plugin pages use the same lifecycle contract.
