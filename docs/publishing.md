# Publishing a plugin

Plugins reach Ervisio users through the marketplace: the signed catalog that Plugins › Browse reads. The catalog is
built by the registry repository, [Ervisio/plugins](https://github.com/Ervisio/plugins). You publish releases in your
own repository; the registry picks them up, a maintainer reviews them, and the registry signs them with the Ervisio
team key. You never sign anything. No new secret is needed for the local commands; they use your existing GitHub CLI login.

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

Install the GitHub CLI and run `gh auth login` once. After merging and pushing your code:

```sh
npm run release -- patch
npm run release -- minor --notes "Add the Logs tab"
```

The command refuses a dirty checkout or a local commit that differs from GitHub's default branch. It queues the
GitHub release workflow and prints its URL. After the workflow has bumped the version, run `git pull --ff-only`.
For Drive, run these commands inside `plugin/` (`npm --prefix plugin run release -- patch` also works).
The SDK also exposes `ervisio-plugin-release` for projects using an updated SDK.


On GitHub: **Actions › Release › Run workflow**, choose `patch`, `minor` or `major`, optionally type the release notes,
and run it. That is all. The workflow (the reusable one in this repository, `.github/workflows/plugin-release.yml`):

1. bumps the version in `plugin/manifest.json` and `package.json`,
2. adds a `## X.Y.Z` section to `CHANGELOG.md`: the notes you typed, or the commit subjects since the last release
   (write commit subjects as you want them read: "Add the Logs tab", "Fix the stop button"),
3. commits `Release X.Y.Z` locally,
4. builds, runs the plugin tests and checks, validates the manifest, then atomically pushes the version and tag and creates the GitHub release,
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

Once the first release exists, run:

```sh
npm run marketplace -- "Monitoring"
```

Alternatively open **Ervisio/plugins → Actions → Register plugin**, enter the manifest id, repository and category.
It validates the package and opens **one PR containing both the source and its first version**. Review and merge
that PR once. Community repositories receive `trust: community`; only Ervisio repositories receive `trust: team`.
Do not register an unreviewed plugin as team merely to avoid review.

After registration:

* The existing organization secret `REGISTRY_TOKEN`, when available to the plugin repository, notifies the registry
  immediately. Without it the registry has a scheduled scan every 15 minutes (GitHub may delay scheduled runs).
* Sync opens a version PR and explicitly dispatches both required checks; no closing/reopening is needed.
* A trusted workflow on the registry's `main` automatically merges **bot-created team updates with exactly unchanged
  capabilities, visibility, platforms and dependencies**, after both checks pass on that exact commit. It then
  explicitly starts signing and catalog deployment. Branch protection remains enabled.
* First versions, community updates and permission changes remain one reviewed PR. Permission reductions are also
  deliberately reviewed; automatic approval never guesses whether a permission change is safe.
* Repository rules are still enforced. If a rule requires human review even for routine team updates, the workflow
  leaves the validated PR open with a warning. See the registry README for the one-time bot permission setup.
* The registry signs packages and the catalog with the team key as before. The signing key stays in the registry.

The reusable workflow supports `working-directory` (default `.`) and `sync-root-version` (default `false`) for an
embedded plugin such as Drive. Keep plugin-specific version synchronization in an npm `version` hook.

Permissions are reviewed carefully: ask for the narrowest commands, HTTP rules and folders that work. Anything that
amounts to root on the machine (an `admin` command, a socket such as Docker's) needs a clear reason in the changelog.

