# Desktop hot-reload dev mode

**Status:** shipped

Run the Electron shell against the Vite web app so UI changes hot-reload
without rebuilding the Docker image. Main/preload TypeScript changes relaunch
Electron via `electronmon`.

## Prerequisites

- Repo checkout with `pnpm` available
- Two terminals (or equivalent)
- Docker is **not** required for the Qui UI path in this mode (API comes from
  `air` / `make dev`). Companion containers are skipped so they do not bind
  `:7476`.

## How to run

**Terminal 1 — web + Go API (Vite on `:5173`, API on `:7476`):**

```bash
make dev
# equivalent: air in one process + pnpm --dir web dev
```

Wait until Vite reports its local URL and the backend is listening on `7476`.

**Terminal 2 — Electron shell:**

```bash
make desktop-dev
# or: cd desktop && pnpm install && QUI_DESKTOP_DEV=1 pnpm run dev:app
```

What that starts:

1. `pnpm build` (initial `tsc` + branding assets)
2. `tsc -w` (rebuild main/preload on change)
3. `electronmon dist/main/index.js` with `QUI_DESKTOP_DEV=1`

The window loads `http://localhost:5173` (login at `/login`). Vite proxies
`/api` to `http://localhost:7476`.

## Environment overrides

| Variable | Effect |
| --- | --- |
| `QUI_DESKTOP_DEV=1` | Load Vite (`http://localhost:5173`) instead of Docker Qui; skip Qui Docker bootstrap |
| `QUI_WEB_ORIGIN=http://localhost:5173` | Same origin override (wins over `QUI_DESKTOP_DEV`) |
| `QUI_DESKTOP_IMAGE=…` | Unused for Qui bootstrap while `QUI_DESKTOP_DEV=1` (containers are skipped) |

Example without Make:

```bash
cd desktop
QUI_DESKTOP_DEV=1 pnpm run dev:app
```

## What hot-reloads vs what restarts

| Change | Result |
| --- | --- |
| React / CSS under `web/` | Vite HMR in the window |
| `desktop/src/main` or `preload` | Electron process relaunches (`electronmon`) |
| Go backend under `internal/` | `air` rebuilds; refresh the page if needed |

## Menu bar developer tools

When running with `QUI_DESKTOP_DEV=1`, the native application menu bar adds a
dedicated top-level **Developer** menu:

- **Toggle Developer Tools** (`Alt+Cmd+I` / `Ctrl+Shift+I`): opens Chromium DevTools for the main window.
- **Reload Electron Window**: reloads the active web contents.
- **Open Vite Dev Origin** (`http://localhost:5173`): opens the Vite development origin in the default browser.
- **Probe Backend Health** (`http://localhost:7476/api/healthz`): checks Go backend responsiveness.
- **Clear Cache and Reload**: clears Electron session cache and triggers a fresh reload.

In production builds (`QUI_DESKTOP_DEV` unset or `0`), the **Developer** menu and all DevTools shortcuts are completely omitted to ensure a clean end-user experience.

## Stop / troubleshoot

- If the window says nothing is serving `:5173`, start Terminal 1 (`make dev`) first.
- Port `7476` already in use by an old `qui` container: stop it
  (`docker stop qui`) or use only `make dev` in this mode.
- Tray → **Reload Qui web app** forces a full navigation to the Vite URL.
- To go back to the packaged/local Docker path, quit Electron and open
  `/Applications/Qui.app` (or `pnpm --dir desktop start` without
  `QUI_DESKTOP_DEV`).

## Related spec

- `BR-desktop-19` — origin selection for production vs desktop dev.
- `BR-desktop-23` — Qui application menu and hot-reload Developer menu.
