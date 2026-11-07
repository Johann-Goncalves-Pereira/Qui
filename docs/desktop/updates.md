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

Packaged builds default the Qui image to:

`ghcr.io/johann-goncalves-pereira/qui:latest`

1. Tray → **Check for Docker Updates…**, or wait for the launch prompt when a
   remote digest differs from local.
2. Choose **Update Now** to pull and recreate containers. Account data in the
   desktop data folder is kept.
3. **Later** dismisses that digest for this machine until a newer one appears
   (or you force-check from the tray).

Override the Qui image (advanced):

```bash
QUI_DESKTOP_IMAGE=ghcr.io/johann-goncalves-pereira/qui:v1.2.3 open -a Qui
```

Or change ports / mounts from the status bar footer badges (Qui / qBittorrent
dialogs).

## Publish a release (maintainers)

1. Tag and push a `v*` tag (or run the **Desktop release** workflow manually).
2. `.github/workflows/desktop-release.yml` builds unsigned `.dmg` + `.zip` and
   attaches them to the GitHub Release.
3. Existing Go/Docker release jobs (when used) publish
   `ghcr.io/johann-goncalves-pereira/qui` for container updates.

## Behaviour summary

- Launch + tray compare semver to GitHub `releases/latest`.
- Download prefers `.dmg`, then `.zip`, else the release HTML URL.
- Packaged apps use GHCR; unpackaged/dev defaults to `qui-desktop:local`.
- Unsigned builds may need Gatekeeper confirmation on each new binary.

## Related spec

- `BR-desktop-17` — packaged vs local Qui image default.
- `BR-desktop-18` — unsigned release prompt with `.dmg` / `.zip` preference.
