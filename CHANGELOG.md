# Changelog

## 0.2.0

Needs Ervisio 0.5 for the new members; plugins written for 0.1 run unchanged and the contract version stays 3. The new
members are optional: guard `api.jobs`, `api.notify` and the others on older consoles.

- Large transfers: `api.download`, `api.downloadCommand` and `api.upload` (progress, cancel, streamed response), and the
  manifest field `capabilities.http[].maxUpload`.
- `saveFile(filename, data, mime?)` (also `api.saveFile`) saves data a plugin holds as a browser download.
- `audit.list(query?)` reads the plugin's entries of the activity log; types `AuditQuery` and `AuditEntry`.
- Environments: `envs.list()`, the `env` option of `http`, `httpStream`, `exec`, `execStream`, `pty`, `download` and
  `upload`, and `remote: "docker"` on commands and HTTP APIs in the manifest.
- Approved hosts: `network.request(host)` and `capabilities.network` as `{ hosts, userHosts }`.
- Background jobs: `api.jobs` (create, list, get, update, delete, runNow, history, webhooks) and the manifest types
  `JobDef`, `JobStep`, `JobParam` and `JobCondition` for `capabilities.jobs`.
- Notifications: `api.notify(...)` and `capabilities.notify`.
- The template pins `v0.2.0`. `docs/sdk.md` documents every new API with an example.

## 0.1.0

First release: SDK v3 types, React shim and JSX runtime, Vite preset (`ervisioPlugin`), `ervisio-plugin-pack`, the
plugin template, and the SDK and publishing documentation (moved from the Ervisio repository).
