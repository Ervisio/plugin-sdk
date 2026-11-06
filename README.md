# Ervisio plugin SDK

Types, a React shim, a Vite preset and a project template for building [Ervisio](https://github.com/Ervisio/ervisio)
plugins (plugin SDK contract version 4).

An Ervisio plugin is a folder with a `manifest.json` and one self-contained ES module. Its code runs in a sandboxed
frame and reaches the machine only through what the manifest declares: commands, HTTP APIs on unix sockets, folders.

## Contents

| Import | What |
|---|---|
| `@ervisio/plugin-sdk` | TypeScript types of the SDK object (`PluginSDK`, `ExecResult`, `HttpResponse`, ...) and of the manifest (`Manifest`, `Capabilities`, ...); `setSdk()` / `getSdk()` |
| `@ervisio/plugin-sdk/react` | The React shim: `react` inside your bundle, forwarding to `sdk.react`; `setReact()` |
| `@ervisio/plugin-sdk/jsx-runtime` | The automatic JSX runtime on top of the shim |
| `@ervisio/plugin-sdk/vite` | `ervisioPlugin()`: Vite config for a single-file ES module without React |
| `ervisio-plugin-pack` (bin) | Copies `plugin/*` next to the bundle, writes the release tarball and its sha256 |
| `template/` | A minimal working plugin with CI and release workflows |

## Getting started

One command makes a new plugin project (template, id, names, platforms, git, the Release button):

```sh
npm exec --yes --package=github:Ervisio/plugin-sdk -- create-ervisio-plugin my-tool --name "My tool" --platforms linux,windows
cd plugin-my-tool
npm install
npm run build        # dist/my-tool/index.js + manifest.json
```

Add `--github Ervisio` to also create and push the GitHub repository (needs the `gh` CLI). Then turn on developer mode
in Ervisio and load `dist/my-tool` from Plugins › Developer.

After pushing your code, run `npm run release -- patch` (requires `gh auth login`), or use **Actions › Release › Run workflow** (patch / minor / major). See
[docs/publishing.md](docs/publishing.md).

The package is not on npm yet; the template depends on it through git:

```json
"devDependencies": { "@ervisio/plugin-sdk": "github:Ervisio/plugin-sdk#v0.6.0" }
```

npm 12 refuses git dependencies by default; the template's `.npmrc` allows them for direct dependencies only
(`allow-git=root`). Commit `package-lock.json` and check that the SDK's `resolved` URL is
`git+https://github.com/...`, so `npm ci` works without SSH keys (npm sometimes records `git+ssh://`; replace it).

## Documentation

* [docs/sdk.md](docs/sdk.md): the SDK object, building with the preset, styling, developing, migrating from v1/v2,
  security notes.
* [docs/publishing.md](docs/publishing.md): releasing a plugin and getting it into the Ervisio marketplace.
* Manifest reference: [docs/api/plugins.md](https://github.com/Ervisio/ervisio/blob/main/docs/api/plugins.md) in the
  Ervisio repository.

A complete plugin built with this SDK: [Ervisio/plugin-docker](https://github.com/Ervisio/plugin-docker).

## License

MIT, see [LICENSE](LICENSE).



## Account-private documents and server file chooser (contract v5)

Feature-check `sdk.data` and `sdk.files.pick` when supporting older consoles. The host owns both features; do not bundle a separate file-manager app.

```ts
if (sdk.files.pick) {
  const selected = await sdk.files.pick({ mode: 'folder', title: 'Backup destination' });
  if (selected) onChosenFolder(selected.path);
}
```

The chooser supports `file`, `folder` and `save`. `initialDirectory`, `initialName` and `title` are optional. Cancellation resolves `null`. Paths identify files on the managed server or a saved SFTP/SMB connection. Choosing a path grants no additional `capabilities.files` access: existing read/write and command rules still apply. A hidden or minimized plugin cannot open the chooser, and closing its frame cancels an outstanding dialog.

`sdk.data` stores documents on the server, isolated by authenticated system account and plugin ID, without requiring a writable home directory. Keys are relative identifiers such as `chats/abc.json`, not filesystem paths. Limits are 4 MiB per document, 64 MiB and 500 documents per account/plugin; storage errors must be shown to the user.

```ts
if (sdk.data) {
  const document = await sdk.data.read('settings.json');
  await sdk.data.write('settings.json', JSON.stringify(nextSettings), document.revision);
}
```

Use an empty revision only when creating a new key. An overwrite or removal needs the exact revision returned by `read` or the preceding `write`. A conflict means another view saved newer content: preserve the unsaved draft and reload, rather than silently overwriting it. `list()` returns document metadata. `remove(key, revision)` removes only that private document.

Long-running updates can call `claim(key, owner)`, where `owner` is a random 32-character lowercase hexadecimal identifier. Renew every 30 seconds and call `release` in a `finally` block. Claims expire after two minutes of server time. While claimed, `write` also receives the same owner as its fourth argument; another view cannot overwrite or delete the active document. Claims require an existing key.

The optional `sdk.view.surface === 'assistant'` identifies a compact assistant surface. Keep the same authentication, persistence and permissions as the full page, and adapt the layout to its available width.

### Shared destination fields

`import { DestinationFields, type Destination } from '@ervisio/plugin-sdk/destinations'` provides the same destination configuration in Backup and Database exports. Render it with `value`, `onChange`, safe saved `connections`, and optional `allowRetention`. It uses the host folder chooser without granting access to files, keeps credential inputs write-only, and does not perform network uploads. The plugin must separately declare the trusted account-owned delivery/backup command in its manifest. External HTTP/ErvisioDrive/ErvisioRepo uploads have no automatic retention. S3 cleanup is explicitly opt-in and requires a conditional-delete-capable endpoint. The backend integration requires Ervisio 7.0.4.
