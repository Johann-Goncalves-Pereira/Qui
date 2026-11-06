# Qui Desktop

**Status:** in progress

The desktop build is a **thin wrapper** around the same Qui **web app** you get in a
browser on the host loopback (default `http://localhost:7476`). Sign-in,
registration (`/setup`), sessions, and navigation are **only** in that web UI.

## Behaviour

- **Main window**: The native window stays clear, so a later glass change can still show the desktop. The Glassmorphism row is a slider for how much of the theme color the page keeps. At 100% the row is unchecked and the page is solid. Any lower value checks the row, keeps that much of the theme color on the shell, sidebar, cards, and popovers, and turns on the macOS HUD vibrancy so the desktop behind the window is blurred. The default below 100% is 60%. On launch the window shows a spinner and a process code block, starts the Docker containers, waits until `GET /api/version` succeeds, then loads the real Qui page at `QUI_WEB_LOGIN_URL` (`http://localhost:7476/login`). That page is the same one a browser gets. There is no second sign-in form.
- **Tray** (menu bar): The status item is the Qui mark at 14pt. The title is empty while idle and shows live download and upload speeds while transfers run. The menu has Docker status, transfer stats, pause/resume, update checks, **Reload Qui web app**, and Quit.
- **Docker**: The desktop runs the local image `qui-desktop:local` (built from this repo, so the glass switch ships with the page). The CLI is resolved from `~/.docker/bin/docker`, `/opt/homebrew/bin/docker`, `/usr/local/bin/docker`, or `Docker.app`. Qui’s `/config` and qBittorrent’s config are bind-mounted under the desktop data folder, so replacing a container does not delete the account. A container that was created without that mount is copied onto the host before it is removed.
  The **Docker image update** dialog appears only when the remote manifest shares no digest with the local image, and not again for a digest you dismissed with Later.
  Users can also install and run a local Gazelle tracker stack ([OPSnet/gazelle](https://github.com/OPSnet/gazelle)) on demand via a one-click button in Settings > Indexers. Qui Desktop automatically clones the official repository into the desktop data directory (`gazelle/repo`), configures the Compose stack, and deploys its services (MySQL, PostgreSQL, Memcached, and Nginx web server) mapped to port `7001`.
- **Account**: Registration and sign-in save the username and password with Electron `safeStorage`. The next sign-in on the login page asks for Touch ID and submits that saved account. A browser session does not see the vault.
- **Sidebar (Electron only)**: The word “qui” is omitted and the logo sits on the right of the sidebar header. The traffic lights are vertically centered with that logo while the sidebar is open. Version metadata and utility buttons are relocated to the bottom status bar footer.
- **Status bar footer & Docker configuration**: A dedicated footer sits below `<main>`, displaying live status badges and mapped ports for `qui` (7476) and `qbittorrent-nox` (8080) alongside relocated version metadata, copyright, language picker, and GitHub links. Clicking each service opens a modal with official Docker parameters (ports, bind mounts, PUID/PGID, UMASK, log level, and restart policies) that allows users to edit and apply configurations.

## Related spec

- `BR-desktop-05` in `docs/specs/catalog.md` — clear window, 50% page while glass is on.
- `BR-web-05` in `docs/specs/catalog.md` — calibrated glassmorphism sidebar translucency.
- `BR-desktop-07` in `docs/specs/catalog.md` — main window loads the bundled Qui web URL (wrapper).

- `BR-desktop-09` in `docs/specs/catalog.md` — startup spinner and process code block.
- `BR-desktop-10` in `docs/specs/catalog.md` — Docker CLI path resolution.
- `BR-desktop-11` in `docs/specs/catalog.md` — Qui data survives container replacement.
- `BR-desktop-12` in `docs/specs/catalog.md` — encrypted account and Touch ID sign-in.
- `BR-desktop-13` in `docs/specs/catalog.md` — Docker update prompt does not repeat a dismissed digest.
- `BR-desktop-14` in `docs/specs/catalog.md` — Docker configuration schemas and IPC inspection.
- `BR-desktop-15` in `docs/specs/catalog.md` — Gazelle Docker companion container can be started, stopped, and queried via desktop bridge and settings UI.
- `BR-web-03` in `docs/specs/catalog.md` — Status bar footer with Docker service indicators.
- `BR-web-04` in `docs/specs/catalog.md` — Docker configuration dialogs with official parameters.
