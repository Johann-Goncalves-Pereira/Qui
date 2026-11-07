# Desktop app updates

**Status:** shipped

Downloadable Qui Desktop builds check GitHub Releases for a newer **shell**
version and check Docker digests for the **Qui container** image. There is no
silent in-app install yet (no Apple Developer ID signing / `electron-updater`).

## Who this is for

People who install Qui from a GitHub Release (`.dmg` / `.zip`) and are not
developing against this repo. Developers who build from source should use
[refresh-script.md](refresh-script.md) instead of waiting for a release.

## Install (first time)

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and leave it running.
2. Open the latest release on GitHub:  
   https://github.com/Johann-Goncalves-Pereira/Qui/releases
3. Download the macOS **`.dmg`** (preferred) or **`.zip`**.
4. Open the archive and drag **Qui.app** into `/Applications`.
5. First launch may show a Gatekeeper warning (builds are unsigned). On macOS
   (Sonoma, Sequoia, and newer), Gatekeeper may display `"Qui.app" is damaged and can't be opened. You should move it to the Trash.`
   To fix it immediately, run `xattr -cr /Applications/Qui.app` and `open -a Qui`, or
   use **System Settings → Privacy & Security** to allow Qui (or right-click → Open).
6. Sign in (or complete `/setup`) in the embedded web UI. Qui and qBittorrent
   containers start automatically.

Data lives under `~/Library/Application Support/Qui/` (config bind mounts,
Electron caches, dismissed Docker digests).

## Update the app shell (Qui.app)

### From inside the app

1. On launch, if a newer GitHub Release exists, a dialog appears.
2. Or open the menu bar tray → **Check for Qui Updates…**.
3. Choose **Download Update**. That opens the `.dmg` / `.zip` (or the release
   page) in your browser.
4. Quit Qui, replace `/Applications/Qui.app` with the new build, then reopen.

The app never downloads or overwrites itself. Version comes from
`desktop/package.json` at build time and is compared to the latest release tag
on `Johann-Goncalves-Pereira/Qui`.

### Manual

1. Quit Qui.
2. Download the new asset from Releases.
3. Replace `/Applications/Qui.app`.
4. Open Qui again.

## Update Docker images (Qui / qBittorrent)

Packaged (downloadable) builds default the Qui **web/API** image to **this
fork’s** GHCR package (lowercase owner/name — GHCR rejects mixed case):

`ghcr.io/johann-goncalves-pereira/qui:latest`

That image is built from **this** repository, so StatusBarFooter, Glassmorphism
controls, Gazelle companion UI, and other desktop fork patches ship with the
app. It is **not** `ghcr.io/autobrr/qui` (vanilla upstream).

Local / unpackaged Electron defaults to `qui-desktop:local` (rebuild with
`./scripts/desktop-refresh`).

1. Tray → **Check for Docker Updates…**, or wait for the launch prompt when a
   remote digest differs from local.
2. Choose **Update Now** to pull and recreate containers. Account data in the
   desktop data folder is kept.
3. **Later** dismisses that digest for this machine until a newer one appears
   (or you force-check from the tray).

Override the Qui image (advanced):

```bash
QUI_DESKTOP_IMAGE=qui-desktop:local open -a Qui
# or pin a tag:
QUI_DESKTOP_IMAGE=ghcr.io/johann-goncalves-pereira/qui:0.0.4 open -a Qui
```

Or change ports / mounts from the status bar footer badges (Qui / qBittorrent
dialogs).

## Publish a release (maintainers)

**Shell (Electron):**

1. After finish-PR, bump + tag (`./scripts/desktop-version-bump-local`) and
   optionally `pnpm --dir desktop package:mac:release` +
   `./scripts/desktop-publish-release-local` ($0 Actions path).
2. Or `.github/workflows/desktop-release.yml` when Actions minutes are available.

**GUI / API (Docker image users pull on first launch):**

1. Build from this checkout (frontend already in `web/dist` / `internal/web/dist`):
   `docker build -t ghcr.io/johann-goncalves-pereira/qui:latest -f Dockerfile .`
2. Push (lowercase tag required):  
   `docker push ghcr.io/johann-goncalves-pereira/qui:latest`  
   (and version tags as needed). Public GHCR packages do not require a paid
   Actions budget.
3. Release workflow jobs that set `REGISTRY_IMAGE` must lowercase
   `github.repository` the same way (already done in `release.yml` push jobs).

Never point packaged desktop defaults at `ghcr.io/autobrr/qui` — that omits
every fork-only web feature.

If the fork GHCR tag is not pullable yet (package not published / token lacks
`write:packages`), the desktop shell still gets this fork’s GUI by:

1. **Retagging** `qui-desktop:local` when that alias exists (from
   `./scripts/desktop-refresh` or `make desktop-publish-qui-image`), or
2. **Downloading** `qui-desktop-image-<arch>.tar.gz` from the matching
   desktop release tag (`/releases/download/v<semver>/…`) and running
   `docker load`, then tagging it as the packaged name.

Maintainers: `make desktop-publish-qui-image` always writes that archive under
`desktop/release/`; `make desktop-publish-release` uploads it with the `.dmg`.
GHCR push remains preferred when `write:packages` is available.

## Behaviour summary

- Launch + tray compare semver to GitHub `releases/latest`.
- Download prefers `.dmg`, then `.zip`, else the release HTML URL.
- Packaged apps pull **fork** GHCR Qui; unpackaged/dev defaults to
  `qui-desktop:local`.
- Unsigned builds may need Gatekeeper confirmation on each new binary.

## Related spec

- `BR-desktop-17` — packaged vs local Qui image default.
- `BR-desktop-18` — unsigned release prompt with `.dmg` / `.zip` preference.
