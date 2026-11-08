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
fork’s** GHCR package pinned to the application version (falling back to `latest`):

`ghcr.io/johann-goncalves-pereira/qui:<version>`

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

## Upstream Web Update Prompt Suppression

Upstream web UI update banners and the `InstallUpdateButton` modal (which instruct users to pull upstream Docker images manually or announce upstream releases like `v1.35.0`) are automatically suppressed inside the Qui Desktop Electron shell (`BR-desktop-29`). Qui Desktop follows its own semantic versioning (`v0.0.x`) and manages container lifecycles internally. In standalone web browser mode (outside Electron), standard upstream update notices remain functional.

## Desktop-Specific Component Update Dialog

When updates are detected, Qui Desktop presents a native dialog specifically tailored to desktop components (`BR-desktop-30`):
- **Component Types:**
  - `desktop-shell`: Electron Desktop native application (`Qui.app`). Requires downloading the new application build, replacing the binary in `/Applications`, and restarting the app.
  - `qui`: Qui Web & API Docker container. Container is pulled and restarted; the desktop window automatically reloads when ready.
  - `qbittorrent-nox`: Companion BitTorrent client container. Container is pulled and restarted; active torrent connections briefly reconnect.
- **Reload Impact:** Every prompt explicitly explains whether the update requires an application restart, a container restart, or an automated web view reload.

## Automated Pre-Update Backups & Zero Data Loss Guarantee

Container updates and app replacements never destroy user configurations (`BR-desktop-31`):
1. **Pre-Update Snapshot:** Before pulling new images or replacing containers, Qui Desktop creates an automated snapshot under `~/Library/Application Support/Qui/backups/` (e.g. `backup-<timestamp>-<component>`).
2. **Archived Artifacts:**
   - Qui SQLite database (`qui.db`) and `.env` from `/config`
   - qBittorrent settings (`qBittorrent.conf`) and torrent resume state (`BT_backup`)
   - Active theme cache (`theme.json`) and safeStorage encrypted vaults
3. **Data Durability:** User data is only ever removed if the user explicitly uninstalls the application (via Homebrew Cask `zap` or manually clearing `~/Library/Application Support/Qui`).

## Backend Release Source Routing to Fork (`BR-backend-03`)

The backend release checking service (`pkg/version/version.go`, `internal/update/service.go`, `cmd/qui/main.go`) queries GitHub Releases API directly for fork repositories (`https://api.github.com/repos/Johann-Goncalves-Pereira/Qui/releases/latest`) instead of upstream `api.autobrr.com`. This ensures release detection accurately identifies fork semantic releases (`v0.0.x`) and eliminates upstream `v1.35.0` version leaks.

## Desktop Multilayer IPC Bridge & Preload API (`BR-desktop-36`)

The sandboxed Electron preload bridge (`window.quiDesktop`) exposes:
- `window.quiDesktop.checkForUpdates()`: Resolves current and latest release metadata (`AppReleaseInfo`) from the fork release repository.
- `window.quiDesktop.promptUpdates()`: Invokes the native multilayer update prompt, evaluating shell binaries, container images (`qui` and companion `qbittorrent-nox`), and executing automated pre-update backups before applying changes.

## Web UI Multilayer Integration (`BR-web-13`)

- **Settings Page:** Under "Application → Update Status", desktop-managed environments render a dedicated **[Check for Updates]** button triggering `window.quiDesktop.promptUpdates()`.
- **Update Banner:** When a newer desktop release is available, `UpdateBanner.tsx` renders a desktop update notice and a **[Review & Update]** button that opens the in-app `DesktopUpdateDialog` (`BR-web-15`). Upstream self-update container modals are completely bypassed in desktop mode.

## Automated Release Changelog Generation (`BR-desktop-40`)

Releases created via `scripts/desktop-publish-release-local` automatically parse commits and merged pull requests since the previous release tag (`git describe --tags --abbrev=0 "${TAG}^"`). The resulting `## What's Changed` section is written directly into the GitHub Release body, ensuring every new version explicitly describes bug fixes, features, and chores.

## In-App Desktop Update Dialog (`BR-web-15`)

Instead of dropping an OS alert sheet (`dialog.showMessageBox`), clicking "Review & Update" renders an in-app `DesktopUpdateDialog` modal styled seamlessly with the active Qui theme. The dialog renders:
- Current version vs available new version
- Publication date and component target
- Formatted release notes and `## What's Changed` changelog description
- Data safety and pre-update snapshot backup guarantees
- Actions: **Later** and **Download & Update**

## Automated In-App Download & Container Synchronization (`BR-desktop-41`)

When the user initiates **Download & Update**, the application never redirects externally to the GitHub release page. Instead:
1. `window.quiDesktop.applyUpdate()` initiates the update sequence in-app.
2. A timestamped pre-update backup snapshot is taken automatically.
3. The matching version container image is downloaded or pulled (`ghcr.io/johann-goncalves-pereira/qui:<version>`).
4. The container is recreated and the web view reloads automatically once the new version is live.

## Homebrew Cask Automated Updates & Native Alert Suppression (`BR-desktop-44`)

- **Native Alert Sheet Suppression:** Intrusive macOS alert sheets (`dialog.showMessageBox`) are suppressed when updates are found on launch or manual check. The main process emits `updater:show-dialog` via IPC, exclusively opening the in-app `DesktopUpdateDialog`.
- **Automated Homebrew Upgrades:** For desktop installations managed via Homebrew Cask (`/opt/homebrew/Caskroom/qui` or `brew list --cask qui`), clicking **Download & Update** internally executes `brew update` to refresh tap metadata, followed by `brew upgrade --cask qui` to update `Qui.app` on disk. The matching Docker container is updated in lockstep, the in-memory app version is advanced, and the web interface reloads seamlessly with the new release version.

## Companion Container Updates & Root Router Hosting (`BR-desktop-45`, `BR-web-17`)

- **Native Container Alert Suppression:** When Docker companion updates (`qbittorrent-nox`, `qui`) are detected on startup or check (`checkAndPromptDockerUpdates`), native macOS `dialog.showMessageBox` alert sheets are completely eliminated. The main process emits `updater:show-container-dialog` with component metadata.
- **Router Root Hosting (`__root.tsx`):** `DesktopUpdateHost` is mounted at the root router route (`web/src/routes/__root.tsx`), ensuring that both shell and container update dialogs trigger on all screens—including initial onboarding (`/setup`), login (`/login`), and dashboard views.
- **In-App Container Dialog (`ContainerUpdateDialog`):** Displays component badges, descriptions, reload/restart impacts, pre-update backup assurances, and action controls (**Later** / **Update Now**).
- **Gatekeeper Quarantine Removal:** Following `brew upgrade --cask qui` or cask installations, `xattr -cr /Applications/Qui.app` is executed automatically (and specified in `Casks/qui.rb` postflight) to strip `com.apple.quarantine` and avoid Gatekeeper verification blockage.

## Behaviour summary

- Launch + tray compare semver to GitHub `releases/latest`.
- Release descriptions always contain `## What's Changed` parsed from commits/PRs between release tags.
- In-app `DesktopUpdateDialog` displays changelog and triggers automatic download without browser redirects.
- In-app `ContainerUpdateDialog` presents companion updates and reload requirements without native OS sheets.
- `DesktopUpdateHost` at router root guarantees update prompts trigger on `/setup`, `/login`, and all views.
- In-app `applyUpdate` performs pre-update backup, synchronizes container, executes brew upgrade for Cask installs, and reloads interface.
- Upstream web update banners and self-update buttons are suppressed in Electron.
- Component update prompts declare exact target types and reload impacts.
- Automatic snapshot backups precede all container and shell updates.

## Related spec

- `BR-desktop-17` — packaged vs local Qui image default.
- `BR-desktop-18` — unsigned release prompt with `.dmg` / `.zip` preference.
- `BR-desktop-29` — upstream web update banner suppression in desktop shell.
- `BR-desktop-30` — desktop-specific component update dialog and reload requirements.
- `BR-desktop-31` — automated pre-update data backup and zero-data-loss protection.
- `BR-backend-03` — backend release source pointed to fork repo via direct GitHub API.
- `BR-desktop-36` — preload bridge exposure of checkForUpdates and promptUpdates.
- `BR-web-13` — Settings and UpdateBanner routing to desktop multilayer engine.
- `BR-desktop-40` — automated release changelog generation on version bump.
- `BR-desktop-41` — automated in-app download and container update via applyUpdate.
- `BR-web-15` — in-app DesktopUpdateDialog with changelog replacing OS alert sheet.
- `BR-desktop-44` — Homebrew Cask automated updates and native alert suppression.
- `BR-desktop-45` — companion container update alert suppression and Gatekeeper quarantine clearing.
- `BR-web-17` — ContainerUpdateDialog and DesktopUpdateHost mounted at root router for seamless multi-route update prompts.
- `BR-desktop-48` — Startup update alert suppression and Homebrew postflight_steps modernization.


