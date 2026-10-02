# Plugin SDK 0.2, contract version 3

SDK 0.2 adds large transfers, `saveFile`, the activity log, environments, approved hosts, background jobs and notifications
(see "SDK 0.2" below; they need Ervisio 0.5 or later). Everything from SDK 0.1 works unchanged.

A plugin is a folder with `manifest.json` and one ES module. The manifest reference, with every validation rule, is
[docs/api/plugins.md](https://github.com/Ervisio/ervisio/blob/main/docs/api/plugins.md) in the Ervisio repository.

Plugin code never runs inside the app. Each page or widget of a plugin runs
in its own sandboxed frame:

```
app (http(s)://host)                              plugin frame (opaque origin "null")
  PluginFrame ── <iframe sandbox="allow-scripts allow-forms" src="/plugin-frame/<id>"> ──▶ runtime + your module
      │  postMessage: init {code, view, theme, lang}             │
      │◀──────────── req {op: exec | http | readFile | …} ────────┤
  broker (Ervisio's web/src/plugins/broker.ts): checks the request against your manifest,
      │  then calls plugins.exec / plugins.http / plugins.readFile / … (the daemon checks the manifest again)
```

* The frame has **no same-origin access**: no cookies, no `localStorage`, no access to the app's DOM, and it cannot
  call `/api/*`. Its Content-Security-Policy allows no network at all, except `https://`/`wss://` connections to the
  hosts in `capabilities.network`. It cannot open pop-ups or navigate the app; if it navigates itself away, the app
  stops it.
* The app fetches your entry module and hands its source to the frame, which imports it from a `blob:` URL.
  **The entry must be one self-contained ES module** (bundle your code). Relative `import`s do not work; load other
  files of your folder with `sdk.asset()`.
* There is no `sdk.api.call` / `sdk.api.stream` any more: a plugin can do exactly what its manifest declares.

`plugins.list` tells the app which plugins are enabled for the user. Disabled plugins, plugins blocked by the signature
policy and plugins whose `visibleTo` excludes the user are neither listed nor served (`/plugins/<id>/…` and
`/plugin-frame/<id>` answer 404).

## Module shape

```js
// index.js (a plain module; with the Vite preset you write TypeScript and JSX instead, see "Building")
export default function activate(sdk) {
  const { react: React, ui } = sdk;
  const h = React.createElement;
  const { Page, StatCard, Table, Button, toast } = ui;

  sdk.registerStrings({
    en: { title: 'Containers', empty: 'No containers running.' },
    it: { title: 'Container', empty: 'Nessun container in esecuzione.' },
  });

  function Containers() {
    const [rows, setRows] = React.useState([]);
    React.useEffect(() => {
      sdk.api.exec('ps').then((r) => setRows(r.stdout.split('\n').filter(Boolean).map(JSON.parse)));
    }, []);
    return h(Page, { title: sdk.t('title'), hue: 'file' } /* , … */);
  }

  sdk.registerPage('docker', Containers);                 // = contributes.pages[].id
  sdk.registerWidget({ id: 'containers', render: Widget }); // = contributes.widgets[].id
}
```

`default` may be a function `(sdk) => void | Promise<void>`, an object `{ activate(sdk) }`, or a named export
`activate`. Each frame shows one view, so `activate` runs once per open page or widget; register everything every
time and the runtime renders the view the frame was opened for. Do not bundle React: use `sdk.react`.

Snippets are plain data now: declare them in `manifest.contributes.snippets`. `sdk.registerSnippet` is a no-op kept so
v1 plugins do not throw.

## Building

The preset in this package bundles a plugin the way the frame needs it: one self-contained ES module, React not
bundled.

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { ervisioPlugin } from '@ervisio/plugin-sdk/vite';

export default defineConfig(ervisioPlugin({ id: 'my-plugin', entry: 'src/index.ts' }));
```

Options: `entry` (default `src/index.ts`), `outDir` (default `dist/<id>`), `fileName` (default `index.js`, the
manifest's `entry`), `emptyOutDir` (default `false`), `minify` (default `true`), `config` (extra Vite config, merged
with `mergeConfig`). Static files of the plugin (`manifest.json`, images, data files read with `sdk.asset()`) live in
`plugin/`; `ervisio-plugin-pack copy` copies them next to the bundle and `ervisio-plugin-pack pack` writes the release
tarball (see [publishing.md](publishing.md)).

### React and the SDK at activation time

React is not bundled. The preset aliases `react` and the JSX runtime (`react/jsx-runtime`, `react/jsx-dev-runtime`)
to `@ervisio/plugin-sdk/react` and `@ervisio/plugin-sdk/jsx-runtime`, which forward every call to `sdk.react`. The SDK
object exists only inside `activate()`, so:

* In `activate`, call `setSdk(sdk)` and `setReact(sdk.react)` before anything else:

  ```ts
  import { setReact } from '@ervisio/plugin-sdk/react';
  import { setSdk, type PluginSDK } from '@ervisio/plugin-sdk';

  export default function activate(sdk: PluginSDK) {
    setSdk(sdk);
    setReact(sdk.react);
    sdk.registerPage('main', App);
  }
  ```

* Never call a React API at module top level (`createContext`, `memo`, `forwardRef`, `lazy`): create those inside
  `activate()` or inside components. Hooks and JSX inside components are fine, because they only run while rendering.
* Read the SDK with `getSdk()` inside functions and components, never at import time.
* Bundle everything else you use (libraries such as `@xterm/xterm` or `yaml` are fine); the result must stay one file.

TypeScript: install `@types/react` (18) and set `"jsx": "react-jsx"`, `"moduleResolution": "bundler"`. The types of the
SDK object are exported by `@ervisio/plugin-sdk` (`PluginSDK`, `ExecResult`, `HttpResponse`, ...), with the manifest
types (`Manifest`, `Capabilities`, `Command`, `HttpApi`, `Folder`, `Contributes`).

## The SDK object

| member | description |
|---|---|
| `version` | `3`. Check it if your plugin also supports older consoles: `if (sdk.version < 3) …` (v3 adds `api.http`, `api.httpStream`, `api.pty`, `files.mkdir`, `files.remove`). |
| `plugin` | `{ id, name, version }`. |
| `appOrigin` | The console's origin as the user reaches it (`https://host:9090`, or the proxy's). Use it for webhook URLs: `location.origin` is opaque inside the frame. Ervisio 0.5.1 and later. |
| `view` | `{ kind: 'page' \| 'widget', id }`: what this frame shows. |
| `react` | React 18, shared by the runtime and the UI kit. |
| `ui` | The app's own component kit (`Button`, `IconButton`, `Input`, `Select`, `Switch`, `Checkbox`, `Segmented`, `Table`, `Card`, `StatCard`, `Page`, `Panel`, `Dialog`, `ConfirmDialog`, `Sheet`, `Tabs`, `Badge`, `Chip`, `Progress`, `Skeleton`, `EmptyState`, `Menu`, `DropdownMenu`, `Tooltip`, `Icon`, `Sparkline`, `AreaChart`, `toast`, ...). `toast.ok/err/info(title, detail?)` shows the toast in the app, prefixed with your plugin's name. |
| `api.exec(command, args?)` | Runs a command declared in `capabilities.commands` → `{stdout, stderr, exitCode, truncated?}`. A non-zero exit is a normal result. Only declared commands; the daemon validates every argument against the declared pattern. For a command declared `admin` the app adds administrator rights when the user needs them (not when the user is in `adminUnlessGroup` or is root) and shows its normal "Administrator rights needed" dialog. A command not declared `admin` never runs as root. |
| `api.execStream(command, args, {onLine(stream, line), onExit(code), onError(err)})` | Same, streamed per line. Returns `{close()}`; closing kills the process. |
| `api.http(name, {method, path, query?, headers?, body?})` | v3. An HTTP request to the `capabilities.http` entry `name` → `{status, headers, body, json(), bytes()}`. See "HTTP APIs, terminals and admin folders". |
| `api.httpStream(name, {method, path, query?, headers?, body?}, {onStart?(status, headers), onData(chunk), onEnd(), onError(err)})` | v3. Same, with the body delivered as `Uint8Array` chunks as they arrive. Returns `{close()}`; closing ends the connection. |
| `api.download(name, req, filename?, { onDone? })`, `api.downloadCommand(command, args, filename?, { env?, onDone? })` | 0.2. The browser saves the response of a `GET`, or a command's output, as a file, streamed with no size limit. See "Large transfers". |
| `api.upload(name, req, file, opts?)` | 0.2. Sends a `File` as the body of a `POST` or `PUT`, with progress and cancel. See "Large transfers". |
| `saveFile(filename, data, mime?)`, `api.saveFile(...)` | 0.2. Saves data you hold (text, bytes, Blob, up to 64 MiB) as a browser download. |
| `api.jobs`, `api.notify(...)` | 0.2. Background jobs and notifications; missing on consoles older than 0.5. See "Background jobs" and "Notifications". |
| `audit.list(query?)` | 0.2. The activity log, limited to your plugin. See "Activity log". |
| `envs.list()` | 0.2. The environments (remote Docker hosts) the user may use. See "Environments". |
| `network.request(host)` | 0.2. Asks an administrator to approve one more host. See "Approved hosts". |
| `api.pty(command, args, {cols, rows, onData(chunk), onExit(code), onError(err)})` | v3. Runs a command declared `pty: true` in a terminal → `{write(data), resize(cols, rows), close()}`. |
| `files.read(path, { env? })` / `files.readBytes(path, { env? })` | Reads a file inside a folder listed in `capabilities.files.read` or `files.write` (4 MiB max), with the user's own rights. `read` returns text, `readBytes` a `Uint8Array`. |
| `files.write(path, data, { env? })` | Writes (atomically replaces) a file inside a folder listed in `capabilities.files.write`. `data` is a string or `Uint8Array`, 4 MiB max. |
| `files.list(path, { env? })` | Lists a folder inside the declared folders: `[{name, type: 'file'\|'dir'\|'link'\|'other', size, mtime}]`. |
| `files.mkdir(path, { env? })` | v3. Creates a folder (and missing parents) inside a `files.write` folder. |
| `files.remove(path, { env? })` | v3. Removes a file or an empty folder inside a `files.write` folder (never the declared folder itself). |
| `asset(path)` | Fetches a file of your own plugin folder (relative path) and returns a `blob:` URL for `<img src>`, CSS, etc. |
| `open(pageId)` | Opens one of your own pages in the app (for example from a widget). |
| `openExternal(url)` | Opens an `http://` or `https://` address in a new browser tab (the frame cannot open pop-ups itself). Addresses with a user name or password are refused. Use it from a click handler, or the browser may block the tab. |
| `registerPage(id, view)` | `view` is a React component `({sdk}) => element` or `{ render(container, sdk) => cleanup? }` for framework-free code. The page renders in the app's content panel at `/p/<plugin>/<id>`; its rail entry comes from the manifest. |
| `registerWidget({id, render})` | A widget the Overview offers in its library ("From plugins"). Title and icon come from the manifest. It renders in a small frame that grows with its content (up to 720 px). |
| `registerStrings({ en: {...}, it: {...} })` | Your dictionaries; `sdk.t(key, vars?)` uses the app's language, falls back to `en`, then the key, and fills `{name}` placeholders. The frame re-renders when the user changes language. |
| `t(key, vars?)`, `lang()` | See above. |
| `theme.get()` / `theme.onChange(cb)` | `{ id, name, kind: 'dark'\|'light', vars }` with the resolved CSS variables; the runtime applies them to the frame's `:root`, so CSS variables just work. |

Errors from `api.*`, `files.*` and `asset` are `Error`s with a `code` (`forbidden`, `invalid`, `not_found`,
`needs_admin`, `unavailable`, ...) and a readable message.

## HTTP APIs, terminals and admin folders (SDK v3)

### HTTP over a unix socket

Declare the API in `capabilities.http` (full rules in [docs/api/plugins.md](https://github.com/Ervisio/ervisio/blob/main/docs/api/plugins.md)):

```json
"http": [{
  "name": "docker", "socket": "/var/run/docker.sock", "admin": true, "adminUnlessGroup": "docker",
  "headers": ["Content-Type", "X-Registry-Auth"],
  "rules": [
    {"methods": ["GET"], "path": "/v1\\.[0-9]+/containers/json"},
    {"methods": ["POST"], "path": "/v1\\.[0-9]+/containers/[a-zA-Z0-9_.-]+/(start|stop|restart)"}
  ],
  "maxBody": 8388608, "timeoutSec": 60
}]
```

```js
const r = await sdk.api.http('docker', { method: 'GET', path: '/v1.43/containers/json', query: { all: '1' } });
if (r.status === 200) setRows(r.json());
await sdk.api.http('docker', { method: 'POST', path: `/v1.43/containers/${id}/start` });
await sdk.api.http('docker', { method: 'POST', path: '/v1.43/containers/create', query: { name }, body: { Image: 'nginx' } });

const logs = sdk.api.httpStream('docker', { method: 'GET', path: `/v1.43/containers/${id}/logs`, query: { follow: '1', stdout: '1' } }, {
  onStart(status, headers) {},
  onData(chunk) { /* Uint8Array; Docker's multiplexed log frames are yours to split */ },
  onEnd() {},
  onError(e) {},
});
// later: logs.close();
```

* `path` is the URL path only; it must match a rule's regular expression completely, after percent-decoding. Paths
  with `..`, `.`, empty segments, a trailing `/`, an encoded `/` (`%2f`), control characters, a query or a fragment are
  refused. Encode path parts yourself (`encodeURIComponent(name)`).
* `query` is an object (`{k: v}` or `{k: [v1, v2]}`, encoded with `URLSearchParams`) or a raw string.
* `headers` may only use the names in the entry's `headers`. `Host` is fixed; cookies and other client headers are never
  sent. A `body` object is sent as JSON with `Content-Type: application/json`; a string as is; a `Uint8Array` as bytes.
* The result: `status` (a non-2xx status is a normal result, not an error; redirects are returned, never followed),
  `headers` (one string per name), `body` (text), `json()`, `bytes()`. Bodies are capped at `maxBody` (and a single
  `http` response at 11 MiB; use `httpStream` for more). A request body may be up to 8 MiB (the default
  `maxBody`); send larger files with `api.upload`. The console carries an `http` request as one message of at most 12 MiB
  and a signed-in user may have at most two bodies over 1 MiB in flight at once (more wait up to 30 s, then fail with
  `unavailable`), so do not fire many large `http` or `httpStream` bodies in parallel: queue them, or use `upload`.
* Errors: `not_found` (no such API), `invalid` (method, path, query, header or body not allowed), `needs_admin`
  (only if the unlock dialog was dismissed), `forbidden`, `unavailable` (nothing listening, timeout, response too large).
* For an `admin` entry the app adds administrator rights when needed (not when the user is root or in
  `adminUnlessGroup`), exactly as for commands. An entry not declared `admin` never runs as root.

### Terminals

A command declared `"pty": true` runs only through `sdk.api.pty` (and `api.exec` refuses it):

```js
const term = sdk.api.pty('shell', [containerId, '/bin/sh'], {
  cols: 120, rows: 32,
  onData(chunk) { xterm.write(chunk); },     // Uint8Array
  onExit(code) {}, onError(e) {},
});
xterm.onData((s) => term.write(s));          // string or Uint8Array
fit.onResize?.(() => term.resize(xterm.cols, xterm.rows));
// term.close() hangs up and kills the process.
```

### Admin folders and created folders

`capabilities.files.read` / `.write` entries may be objects: `{"path": "/opt/stacks", "admin": true,
"adminUnlessGroup": "docker"}` is used with administrator rights (the app asks for them when needed, as for commands),
or as the user when the user is in `adminUnlessGroup`. `{"path": "~/.config/ervisio/plugins/docker", "create":
true}` is created (0700 under `~`, else 0755) the first time you write into it. `files.mkdir` and `files.remove` work
only inside `write` folders.

Every stream (`execStream`, `httpStream`, `pty`) is closed by the app when your frame goes away (the page is left, the
widget removed, the plugin reloaded or disabled), and a frame has at most 32 streams open at once.

## SDK 0.2

Everything here needs Ervisio 0.5 or later. The contract version stays 3 (`sdk.version === 3`), so check for the
member you need: `if (sdk.api.jobs) …`, `if (sdk.envs) …`. The reference for the manifest fields is
[docs/api/plugins.md](https://github.com/Ervisio/ervisio/blob/main/docs/api/plugins.md); the daemon side of each
feature has its own page in the Ervisio repository (`docs/api/jobs.md`, `notify.md`, `environments.md`).

### Large transfers

`api.http` keeps whole bodies in memory and limits them to 8 MiB. For files of any size use `download` and `upload`.
They go through a one-time, 60-second link tied to the user's session and follow the same rules as `api.http`: the
API's `rules`, administrator unlock, rate limits and the activity log.

```js
// The browser saves the response of a GET as a file. Resolves when the download starts.
const started = await sdk.api.download('docker', { method: 'GET', path: `/v1.43/containers/${id}/export` }, 'container.tar');
toast.ok(`Saving ${started.filename}`);

// Or the standard output of a declared (non-pty) command.
await sdk.api.downloadCommand('dump', [dbName], `${dbName}.sql`);

// Send a File (from an <input type="file">) as the body of a POST or PUT, with progress and cancel.
const up = sdk.api.upload('docker', { method: 'POST', path: '/v1.43/images/load' }, file, ({ loaded, total }) => setPct(loaded / total));
cancelButton.onclick = () => up.cancel();        // rejects with code "cancelled"
const r = await up;                              // like api.http: r.status, r.json(), r.truncated

// A service that answers with progress while it reads the file (a Docker build): stream the response.
await sdk.api.upload('docker', { method: 'POST', path: '/v1.43/build', query: { t: 'app:latest' } }, tarball, {
  onProgress: (p) => {},
  onResponseStart: (status, headers) => {},
  onResponseData: (chunk) => log.write(chunk), // Uint8Array; the result's body is then empty
});
```

* `download` takes a `GET`; `upload` a `POST` or `PUT`, and `req.body` is ignored. The file name of a download is
  cleaned by the daemon (no path, no control characters).
* An upload may be as large as the API's `maxUpload` in the manifest (default 20 GiB, max 1 TiB). Larger files are
  refused before any byte is sent.
* A service that answers with a status other than 2xx makes `download` reject (`unavailable`, with `data.status`); for
  `upload` the status is a normal result, as for `api.http`.
* Both accept `env` in the request (`downloadCommand` in a fourth argument `{ env }`), see "Environments".
* **Knowing when it ended.** The browser fetches the file itself, so the promise only says that the download started.
  Pass `onDone` (the last argument: `api.download(name, req, filename, { onDone })`, `downloadCommand(command, args,
  filename, { env, onDone })`) to hear the end: `onDone({ ok, bytes, error? })` is called once with the number of bytes
  the daemon sent to the browser, or `ok: false` with a reason when the user cancelled, the service broke off, or the
  browser never fetched the link (it expires after a minute). Ervisio 0.5.1 and later; older consoles ignore it.

```js
await sdk.api.download('docker', { method: 'GET', path: `/v1.43/containers/${id}/export` }, 'container.tar', {
  onDone: ({ ok, bytes, error }) => (ok ? toast.ok('Saved', `${bytes} bytes`) : toast.err('Download failed', error)),
});
```

### Saving a file you already hold

The frame is sandboxed and cannot download or open a `blob:` URL; `saveFile` asks the app to do it.

```js
await sdk.saveFile('containers.csv', csvText, 'text/csv');          // same as sdk.api.saveFile
await sdk.saveFile('logs.txt', new Blob([logBytes]));
```

`data` is a string, a `Uint8Array` or a `Blob`, at most 64 MiB. The name is cleaned; no user gesture is needed, but a
frame may save at most 10 files and 256 MiB in 30 seconds. Resolves with `{ filename, size }` when the download starts.

### Activity log

The daemon records every change a plugin makes (commands, terminals, HTTP calls other than `GET` and `HEAD`, uploads,
downloads, file writes and removals) and what background jobs do. Request bodies, headers and secrets in arguments are
never stored. A plugin reads its own entries:

```js
const { entries, next, enabled } = await sdk.audit.list({ action: 'job.run', limit: 20 });
for (const e of entries) console.log(e.time, e.user, e.action, e.target, e.result, e.origin);
const more = next ? await sdk.audit.list({ cursor: next }) : null;
```

Filters: `user`, `action`, `text` (a substring of the target or message), `since` and `until` (milliseconds or ISO 8601),
`limit` (1 to 1000, default 100), `cursor`. Everyone sees their own entries; administrators see all users' (with
administrator rights unlocked). `enabled` is `false` when an administrator turned the log off. `env` and `origin` tell
that a call was for an environment, came from a paired server (`via <server> by <user>`) or was made by a job
(`job <name>` or `webhook`).

### Environments

An administrator adds remote Docker hosts in Settings › Environments (TLS, SSH, a Portainer agent, or another Ervisio
server). A plugin lists the ones the user may use and sends calls to them with an `env` option.

```json
"commands": [{ "name": "docker", "argv": ["docker", "-H", "{env}", "{0}"], "args": [{ "pattern": "ps|images|info" }], "remote": "docker" }],
"http": [{ "name": "docker", "socket": "/var/run/docker.sock", "remote": "docker", "rules": [{ "methods": ["GET"], "path": "/v1\\.[0-9]+/containers/json" }] }]
```

```js
const envs = await sdk.envs.list();                      // [{ id: 'env-1a2b3c4d', name: 'nas', kind: 'ssh', status? }]
const env = envs[0]?.id;                                 // undefined = this machine
await sdk.api.http('docker', { method: 'GET', path: '/v1.43/containers/json', env });
const r = await sdk.api.exec('docker', ['ps'], { env });
await sdk.api.download('docker', { method: 'GET', path: `/v1.43/containers/${id}/export`, env }, 'export.tar');
sdk.api.pty('shell', [id, '/bin/sh'], { cols: 80, rows: 24, env, onData, onExit, onError });
```

* The capability or command must declare `"remote": "docker"`; a command also needs exactly one `{env}` item in `argv`,
  which the daemon fills in. Without `remote`, an `env` is refused (`forbidden`).
* Against an environment the call runs with the user's own rights through the user's tunnel: administrator rights do
  not apply. Access lists are decided by the administrator; `envs.list()` shows only environments the user may use and
  never any secret.
* `envs.list()` also gives `address` for display: `host:port`, `user@host:port` for ssh, or the other server's host.
  It is not a secret and is shown to everyone who may use the environment. Ervisio 0.5.1 and later.
* **Files on a paired server.** `files.read`, `readBytes`, `write`, `list`, `mkdir` and `remove` take `{ env }` for an
  environment of kind `ervisio`: the call runs on that server, as the user the pairing maps to, under *that server's*
  copy of your manifest (its folders, limits and admin rules), and shows in the activity log of both servers. Use
  absolute paths. An `admin` folder works only if the paired user is root or in the folder's `adminUnlessGroup`
  (otherwise `needs_admin`): a pairing never gets administrator rights. The other kinds (`tcp-tls`, `ssh`,
  `portainer-agent`) refuse `env` on files calls: use paths on this machine there. The plugin must also declare
  `remote` on some HTTP API or command. Ervisio 0.5.1 and later.

```js
await sdk.files.write('/opt/stacks/web/compose.yaml', yaml, { env });   // env of kind 'ervisio'
```
* Streams (`httpStream`, `execStream`) through a `portainer-agent` environment arrive in 4 KiB steps: the agent buffers
  them itself. Use SSH or TLS for live logs.
* Background jobs cannot target an environment yet.

### Approved hosts

A plugin may declare `"network": { "hosts": ["registry.example.org"], "userHosts": true }`. It can then ask for one more
host at run time; an administrator approves one exact `host:port` in a dialog and the app reloads the plugin's frames.

```js
try {
  await sdk.network.request('registry.local:5000', { scheme: 'http' });  // https unless approved as http
} catch (e) {
  if (e.code === 'forbidden') toast.err('The administrator refused this host');
}
```

### Background jobs

A plugin declares jobs in `capabilities.jobs` and creates **instances** of them at run time. The daemon runs an instance
on an interval (at least one minute), at times of the day, on demand or from a webhook, as the user who created it, also
while nobody is signed in, and keeps it across restarts. A job is a list of steps over the plugin's own declared
commands and HTTP APIs: nothing more than the plugin could do by hand. Full rules: `docs/api/jobs.md` in the Ervisio repository.

```json
"capabilities": {
  "notify": true,
  "commands": [
    { "name": "git-fetch", "argv": ["git", "-C", "{0}", "fetch"], "args": [{ "pattern": "/opt/stacks/[a-z0-9_.-]+" }] },
    { "name": "git-rev", "argv": ["git", "-C", "{0}", "rev-parse", "{1}"], "args": [{ "pattern": "/opt/stacks/[a-z0-9_.-]+" }, { "pattern": "HEAD|@\\{u\\}" }] },
    { "name": "git-pull", "argv": ["git", "-C", "{0}", "pull", "--ff-only"], "args": [{ "pattern": "/opt/stacks/[a-z0-9_.-]+" }] }
  ],
  "jobs": [{
    "name": "git-poll", "description": "Pull a stack when its Git remote moved.", "timeoutSec": 600,
    "params": [{ "name": "dir", "pattern": "/opt/stacks/[a-z0-9_.-]+" }],
    "webhook": { "params": ["dir"] },
    "steps": [
      { "id": "fetch", "command": "git-fetch", "args": ["{param.dir}"] },
      { "id": "local", "command": "git-rev", "args": ["{param.dir}", "HEAD"] },
      { "id": "remote", "command": "git-rev", "args": ["{param.dir}", "@{u}"] },
      { "id": "pull", "if": { "step": "remote", "when": "differs", "other": "local" }, "command": "git-pull", "args": ["{param.dir}"] },
      { "id": "tell", "if": { "step": "pull", "when": "ok" }, "notify": { "title": "Updated {param.dir}", "level": "success" } }
    ]
  }]
}
```

```js
if (!sdk.api.jobs) return;                                              // consoles older than 0.5
const job = await sdk.api.jobs.create({ job: 'git-poll', name: 'web stack', params: { dir: '/opt/stacks/web' }, schedule: { every: 900 } });
await sdk.api.jobs.create({ job: 'git-poll', params: { dir: '/opt/stacks/db' }, schedule: { at: ['03:30'], days: [1, 5] } });
const all = await sdk.api.jobs.list({ job: 'git-poll' });
await sdk.api.jobs.update(job.id, { schedule: { every: 3600 }, enabled: true });
const { run } = await sdk.api.jobs.runNow(job.id);
const runs = await sdk.api.jobs.history(job.id, 5);                      // the last 20 runs are kept, with step logs
await sdk.api.jobs.delete(job.id);

// Webhooks: POST <origin>/hooks/<plugin>/<token>, no sign-in; the token is shown only once.
const hook = await sdk.api.jobs.webhooks.create(job.id, 'CI');
const url = sdk.appOrigin + hook.path;                                   // the app's origin; location.origin is opaque in a frame
await sdk.api.jobs.webhooks.regenerate(job.id, hook.id);
await sdk.api.jobs.webhooks.revoke(job.id, hook.id);
```

* A step can run only after an earlier one succeeded, failed, changed or differs from another (`if`); `continueOnError`
  lets a later step react to a failure. Text takes `{param.x}`, `{step.id.stdout}`, `{job}`, `{instance}`, `{plugin}`.
* A job with steps that run as root (`admin` commands or APIs) is created **waiting for approval**: the instance has
  `awaitingApproval: true` and `adminSteps` (the steps that run as root) and does not run. An administrator approves it
  in Settings › Plugin jobs; a plugin cannot (`confirmAdmin` is ignored). A plugin update that changes the job, a
  command or API it uses, or new param values (`jobs.update` with other `params`) need a new approval, and a webhook
  call may not set params on such an instance. The instance is switched off when its owner loses admin rights.
  Show `awaitingApproval` in your UI so the user knows to ask an administrator.
* `timeoutSec` on a command step (up to 6 hours, never more than the job's own `timeoutSec`, which is also up to 6
  hours) replaces the command's own 600-second limit for that step: use it for long work such as a volume backup.
* One run at a time per instance, a timeout, the last 20 runs kept. Settings › Plugin jobs lists every instance for
  administrators. Failures send an alert to the channels that subscribe to jobs.
* Runs, step commands and HTTP calls, accepted webhooks and approvals go to the activity log with `origin` `job <name>`
  or `webhook`.

### Notifications

With `"notify": true` in `capabilities`, a plugin sends a message to the channels an administrator configured in
Settings › Notification channels (email, Telegram, a webhook, ntfy, Gotify). It is rate limited per plugin and sender (10 a minute, 60 an hour for each user, and separately for each job instance).
The message's source is set by Ervisio, not by the plugin: `Docker (alice)` for a page, `Docker job <name> (<owner>)` for
a job step, so a message cannot pretend to come from someone else.

```js
const r = await sdk.api.notify({ title: 'Backup finished', body: '12 volumes, 3.4 GiB', level: 'success', link: '/p/docker/volumes' });
// r = { channels: 2, delivered: 2, failed: 0 }; level is info (default), success, warn or error
```

### Requiring a newer Ervisio

A plugin that needs members added after 0.5.0 says so in its manifest: `"minCore": "0.5.1"` or
`"requires": { "ervisio": ">=0.5.1" }` (the same thing; only `>=` or a bare `X.Y.Z` is understood). A core that is older
refuses to install the plugin, to enable it and to run it, and says which version it needs. Older cores that do not know
the field refuse the manifest ("unknown field"), with the same result. Put the same field on your entry in the registry
when you publish (see [publishing.md](publishing.md)) so Browse shows "Needs a newer Ervisio" instead of an Install button.
To use a new member on a console that may be older, guard on it instead (`if (sdk.appOrigin)`, `if (sdk.api.jobs)`).

## Styling

The frame already carries the app's tokens, the UI kit CSS and the Figtree / JetBrains Mono fonts. All theme tokens are
CSS variables on `:root`: `--bg --surface --sunk --ink --ink2 --ink3`, section colours
`--h-ov --h-term --h-file --h-log --h-svc --h-sw --h-usr --h-plg` (and `-s` soft fills), status colours
`--ok --warn --err --info` (and `-s`), accent `--acc`, `--on-acc`. Use them instead of fixed colours so every theme works,
follow Ervisio's design rules (rounded rectangles, no grey divider lines) and prefer the `ui` components. Wrap content in
a hue scope with `className="hue-plg"` to get `--h` and `--s`. The frame background is transparent: a page sits on the
app's content panel, a widget inside its Overview card. Inline styles and `<style>` elements work; external stylesheets
do not (use `sdk.asset()` and a `<style>` with the text if you must).

## Developing

* Start from the template: `npx degit Ervisio/plugin-sdk/template my-plugin` (or copy the `template/` folder), then
  `npm install` and `npm run build` (the template's `.npmrc` lets npm 12 fetch the SDK from git). Change the id in `plugin/manifest.json`, `vite.config.ts` and `src/index.ts`.
* Turn on developer mode in Ervisio (`plugins.dev = true` in Settings, or a daemon started with `--dev`) and load
  `dist/<id>` from Plugins › Developer (`plugins.loadDev`). Dev folders may be unsigned while developer mode is on;
  they carry an "Unsigned, dev" badge. Everywhere else, `plugins.allow_unsigned = false` (the default) blocks unsigned
  plugins.
* `npm run dev` rebuilds on change; "Reload" in Plugins › Developer restarts every open plugin frame with the new code.
* You do not sign your plugin. Plugins listed in the Ervisio marketplace are reviewed and signed by the Ervisio team
  through the registry, [Ervisio/plugins](https://github.com/Ervisio/plugins): see [publishing.md](publishing.md).

## Migrating from SDK 0.1

Nothing to change: SDK 0.1 plugins run unchanged. The new members are optional and need Ervisio 0.5; on an older
console `api.jobs`, `api.notify`, `sdk.envs`, `sdk.audit`, `sdk.network`, `api.download`, `api.upload` and `saveFile` are
missing, so guard the ones you use.

## Migrating from SDK v2

Nothing to change: v2 plugins run unchanged and their manifests stay valid (and keep their signatures). v3 only adds
`capabilities.http`, `pty` commands and object entries in `capabilities.files`, with the SDK calls above.

## Migrating from SDK v1

| v1 | v2 |
|---|---|
| module imported into the app page | module runs in a sandboxed frame; one self-contained file |
| `sdk.api.call(method, …)`, `sdk.api.stream(…)` | removed; use `sdk.api.exec` / `sdk.api.execStream` with declared commands, `sdk.files.*` for declared folders |
| `sdk.api.exec(cmd, args, {admin})` | `sdk.api.exec(cmd, args)`: admin follows the manifest |
| `sdk.plugin.baseUrl` + `fetch`/`<img src>` | `await sdk.asset('img/logo.png')` |
| `sdk.registerSnippet(...)` | `manifest.contributes.snippets` |
| `registerWidget({id, title, icon, cols, render})` | `registerWidget({id, render})`; title and icon from the manifest |
| `ui.toast` inside the page | same call; the toast appears in the app |

## Security notes

The sandbox is the boundary: a plugin can reach the machine only through its declared commands (validated by the daemon,
as the user or, for `admin` commands, with the administrator rights the user unlocks), its declared HTTP APIs and its
declared folders (with the user's own rights, or administrator rights for folders declared `admin`, confined with
`os.Root` so symlinks cannot leave them). `capabilities.sockets` is informational, but **`capabilities.http` is not: each
entry grants API access to a local service** through its socket, limited to the declared methods, paths and headers.
How much that is depends on the service, and the consent dialog says so: **access to the Docker socket (or membership
of the `docker` group, or an `admin` entry) is equivalent to root on the machine**, because the Docker API can start a
privileged container that mounts `/`. The path rules narrow what the plugin can do, but a rule as broad as "create
containers" already gives a plugin root. Treat `admin` and `adminUnlessGroup` HTTP APIs, `admin` pty commands and
`admin` folders exactly like `admin` commands when you decide whether to install a plugin. The frame's own network
access is limited to
`capabilities.network` hosts over https/wss, and requests from the frame never carry the user's session cookie.
A plugin can still show the user whatever it likes inside its frame, and it can send data it was given to a declared
network host, or away by navigating its own frame (the app then stops the frame). Install plugins you trust; signed
plugins are verified against the Ervisio team key.
