# Ervisio plugin SDK

Types, a React shim, a Vite preset and a project template for building [Ervisio](https://github.com/Ervisio/ervisio)
plugins (plugin SDK contract version 3).

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

Releasing is one button: **Actions › Release › Run workflow** (patch / minor / major). See
[docs/publishing.md](docs/publishing.md).

The package is not on npm yet; the template depends on it through git:

```json
"devDependencies": { "@ervisio/plugin-sdk": "github:Ervisio/plugin-sdk#v0.3.0" }
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
