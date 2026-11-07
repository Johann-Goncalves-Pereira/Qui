# Desktop refresh script

**Status:** shipped

One command rebuilds the local Qui Docker image from this checkout and clears
Electron web caches so `/Applications/Qui.app` (or `pnpm start`) shows the
current UI — including features that were merged but missing because an old
image or service worker was still serving assets.

## When to use it

- After `git pull` / merging PRs that change `web/` or the Go server
- When the status bar (or other UI) is in source but missing in the running app
- When the app shows “qui updated → Reload” but the UI still looks old

For day-to-day UI iteration, prefer [dev-mode.md](dev-mode.md) instead of
rebuilding the image every time.

## Prerequisites

- Docker Desktop running
- Repo root as cwd
- `pnpm` if you use `--install-app`

## How to run

From the repo root:

```bash
# Rebuild frontend + qui-desktop:local, recreate container, clear caches
./scripts/desktop-refresh

# Same via Make / package script
make desktop-refresh
pnpm --dir desktop refresh
```

### Flags

| Flag | Meaning |
| --- | --- |
| `--pull` | `git pull --ff-only` before building |
| `--install-app` | Run `pnpm --dir desktop install:local` (rebuild Qui.app into `/Applications`) |
| `--open` | `open -a Qui` after finishing |
| `-h` / `--help` | Print usage |

Common full refresh after pulling:

```bash
./scripts/desktop-refresh --pull --install-app --open
```

Only refresh the container image (app already installed):

```bash
./scripts/desktop-refresh --open
```

## What it does (in order)

1. Optional `git pull --ff-only` (`--pull`)
2. `make frontend` — builds `web/dist` and copies into `internal/web/dist`
3. `docker build -t qui-desktop:local -f distrib/docker/Dockerfile .`  
   The root host binary `qui` / `qui.exe` is listed in `.dockerignore` so a
   macOS Mach-O cannot be copied into the Linux image.
4. Stops and removes the existing `qui` container, then `docker run` with the
   same bind mounts the desktop app expects under
   `~/Library/Application Support/Qui/docker/…`
5. Deletes Electron `Service Worker`, `Cache`, and `Code Cache` for Qui
6. Optional `--install-app` / `--open`

## After it finishes

1. If Qui was already open, use tray → **Reload Qui web app**, or quit and
   reopen.
2. Confirm the footer shows **Version …** and service badges (`qui:7476`,
   `qbittorrent:8080`) on an authenticated page (not `/login`).
3. Status bar and other Electron-only UI only appear after you are signed in.

## Troubleshoot

| Symptom | Fix |
| --- | --- |
| Build fails on `qui: syntax error` in the image | Ensure `.dockerignore` contains `qui`; remove a stale host `./qui` from the build context if you overrode ignore |
| UI still old after refresh | Quit Qui fully, re-run the script, confirm `docker images qui-desktop:local` has a new Created time |
| Port 7476 busy | `docker ps` and stop the old container; the script removes `qui` by name |
| Want fork GHCR instead of local | Packaged builds use `ghcr.io/johann-goncalves-pereira/qui:latest`, or set `QUI_DESKTOP_IMAGE` — see [updates.md](updates.md). Never use upstream `autobrr/qui` if you need fork UI. |

## Related spec

- `BR-desktop-20` — refresh script invariants.
