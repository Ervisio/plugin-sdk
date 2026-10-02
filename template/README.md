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
