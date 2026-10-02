# Publishing a plugin

Plugins reach Ervisio users through the marketplace: the signed catalog that Plugins › Browse reads. The catalog is
built by the registry repository, [Ervisio/plugins](https://github.com/Ervisio/plugins). You publish releases in your
own repository; the registry picks them up, a maintainer reviews them, and the registry signs them with the Ervisio
team key. You never sign anything and your repository needs no secrets.

## Repository layout

The template in this repository (`template/`) has this layout; use it as is:

```
plugin/manifest.json   the manifest, without "files" (the registry adds it when it signs)
plugin/...             other static files shipped with the plugin (images, data read with sdk.asset())
src/                   the source; the entry's default export is activate(sdk)
vite.config.ts         ervisioPlugin({ id: '<id>' }) from @ervisio/plugin-sdk/vite
package.json           "version" equal to the manifest version
CHANGELOG.md           one "## X.Y.Z" section per release
.github/workflows/     ci.yml and release.yml from the template
```

`npm run build` bundles the code to `dist/<id>/index.js` and copies `plugin/*` next to it; `npm run pack` writes the
release tarball. Both use `ervisio-plugin-pack`, installed with this package.

## Releasing

1. Set the new version in `plugin/manifest.json` and `package.json`, and add a `## X.Y.Z` section to `CHANGELOG.md`.
   Say plainly what changed, and say it when the release asks for new permissions (capabilities) and why.
2. Commit, then tag and push: `git tag -a vX.Y.Z -m "X.Y.Z" && git push origin vX.Y.Z`.
3. The release workflow checks that the tag equals the manifest and package versions, builds, validates the manifest
   with Ervisio's own validator, and creates the GitHub release.

### Release assets (the contract with the registry)

A release with tag `vX.Y.Z` (X.Y.Z equal to the manifest's `version`) carries exactly:

| Asset | Content |
|---|---|
| `<id>-<X.Y.Z>.tar.gz` | gzip tar with one top folder `<id>/` holding `manifest.json` (unsigned: no `files` key, no `manifest.sig`) and the built files (`index.js`, assets). Only regular files and folders; reproducible (`tar --sort=name --owner=0 --group=0 --numeric-owner --mtime=@<commit time> --format=gnu`, `gzip -n -9`). |
| `<id>-<X.Y.Z>.tar.gz.sha256` | One line: `<sha256 hex>  <id>-<X.Y.Z>.tar.gz`. |

The release body is the `CHANGELOG.md` section of the version; the registry shows its first paragraph (up to 500
characters) as the release notes in Browse.

## Getting listed

Open a pull request on [Ervisio/plugins](https://github.com/Ervisio/plugins) that adds your repository to
`registry.json`, following its [CONTRIBUTING.md](https://github.com/Ervisio/plugins/blob/main/CONTRIBUTING.md). After
that:

* The registry checks the latest release of every listed repository every few hours. A new version becomes a pull
  request in the registry that shows the manifest, the release notes and the permission changes against the previous
  version ("new permissions: ..."). A maintainer can also run the registry's "Sync" workflow by hand for a faster
  pickup.
* Only registry maintainers merge. On merge, the registry signs the plugin with the Ervisio team key (`manifest.sig`
  over the manifest, which lists the sha256 of every file), attaches the signed tarball to a release of the registry,
  and publishes the new signed catalog.
* Every plugin in the catalog is signed and shows as verified. Ervisio installs only signed plugins by default, and
  the consent dialog shows the user exactly the permissions your manifest asks for.

Permissions are reviewed carefully: ask for the narrowest commands, HTTP rules and folders that work. Anything that
amounts to root on the machine (an `admin` command, a socket such as Docker's) needs a clear reason in the changelog.
