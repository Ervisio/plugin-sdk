# Hello, an Ervisio plugin

A minimal plugin made from the template in [Ervisio/plugin-sdk](https://github.com/Ervisio/plugin-sdk): one page that
shows the output of `uptime`.

```sh
npm install
npm run build    # typecheck, bundle to dist/hello/index.js, copy plugin/* next to it
npm run pack     # dist/hello-<version>.tar.gz and .sha256
```

Load `dist/hello` from Ervisio › Plugins › Developer (developer mode on) while you work on it. To publish it, see
[Publishing a plugin](https://github.com/Ervisio/plugin-sdk/blob/main/docs/publishing.md).


## Publish

After pushing your code, run `npm run release -- patch` (or `minor` / `major`). Requires GitHub CLI with `gh auth login`.
After the first release, run `npm run marketplace -- "Monitoring"` once and review the registration PR.
Later team releases with unchanged permissions are validated and published automatically, subject to repository rules.
