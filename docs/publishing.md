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

On GitHub: **Actions › Release › Run workflow**, choose `patch`, `minor` or `major`, optionally type the release notes,
and run it. That is all. The workflow (the reusable one in this repository, `.github/workflows/plugin-release.yml`):

1. bumps the version in `plugin/manifest.json` and `package.json`,
2. adds a `## X.Y.Z` section to `CHANGELOG.md`: the notes you typed, or the commit subjects since the last release
   (write commit subjects as you want them read: "Add the Logs tab", "Fix the stop button"),
3. commits `Release X.Y.Z`, tags `vX.Y.Z` and pushes both,
4. builds, validates the manifest with Ervisio's own validator and creates the GitHub release,
5. tells the registry, which publishes it (see below).

When a release asks for new permissions, say so in the notes and why. Pushing a `vX.Y.Z` tag yourself still works:
the workflow then does steps 4 and 5.

If `main` is protected so that GitHub Actions cannot push to it, allow `github-actions[bot]` to bypass the rule, or
release by pushing the tag yourself.

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

* The release workflow tells the registry right away when the organization secret `REGISTRY_TOKEN` exists (a
  fine-grained token allowed to run workflows on Ervisio/plugins: "Contents: read and write" there). Without it the
  registry checks every listed repository every six hours.
* **Plugins of the Ervisio team** (`"trust": "team"` in `registry.json`): a new version that asks for **no new
  permissions** is signed and published at once, with no pull request; it is in the marketplace a few minutes after
  you press Release. A version with new or wider permissions, and the first version of a plugin, become a pull
  request that shows the manifest, the notes and the permission changes; a maintainer merges it, then it is
  published.
* **Community plugins**: every new version is a pull request, reviewed by a maintainer.
* On publish the registry signs the plugin with the Ervisio team key (`manifest.sig` over the manifest, which lists the
  sha256 of every file), attaches the signed tarball to a release of the registry, and publishes the new signed
  catalog.
* Every plugin in the catalog is signed and shows as verified. Ervisio installs only signed plugins by default, and
  the consent dialog shows the user exactly the permissions your manifest asks for.

Permissions are reviewed carefully: ask for the narrowest commands, HTTP rules and folders that work. Anything that
amounts to root on the machine (an `admin` command, a socket such as Docker's) needs a clear reason in the changelog.
