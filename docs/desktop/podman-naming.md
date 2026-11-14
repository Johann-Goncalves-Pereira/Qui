# Podman-only desktop runtime naming

**Status:** shipped

Qui Desktop runs companion containers with the **Podman** CLI only. Code, IPC,
preload bridge, tray/menu copy, settings dialogs, and wiki text use **Podman**
(or neutral “container”) names — not Docker.

## Renames

| Area | Convention |
| ---- | ---------- |
| Main module | `desktop/src/main/podman.ts` (`PodmanManager`, `CliPodmanExecutor`) |
| IPC | `podman:*` channels |
| Preload / `window.quiDesktop` | `getPodmanStatus`, container config helpers without `Docker` in the name |
| Host data root | `…/Qui/podman/` (migrates from legacy `…/Qui/docker/` when present) |
| Web | `usePodmanServices`, `components/podman/`, i18n namespace `podman` |
| Catalog owner | `desktop/podman` |
| Dismissed digests | `dismissed-podman-digests.json`; `dismissed-docker-digests.json` is read when the new file is missing |
| Update check | `podman manifest inspect` (no `buildx` path) |
| Compose | `podman compose`, then `podman-compose` only (no Docker CLI fallback) |
| Dev refresh | `scripts/desktop-refresh` uses `podman build` / `podman run` and renames `…/Qui/docker/` when needed |

## Unchanged (not the desktop runtime brand)

- `host.docker.internal` and `--add-host=host.docker.internal:host-gateway`
- Image publish scripts (`scripts/desktop-publish-qui-image`, `docker build/push/save` to GHCR); they build and push the OCI image, not the desktop runtime
- Gazelle upstream files `docker-compose.yml` / `docker-compose.override.yml` (filenames only; compose is invoked via `podman compose` / `podman-compose`)
- Image build trees (`Dockerfile`, `distrib/docker/`, Makefile image targets)
- Upstream product docs that describe running Qui **in** Docker for non-desktop users
- Issue section **Upstream Docker Alignment** (upstream image layout risk, not the CLI)

## Spec

- `BR-desktop-55` in `docs/specs/catalog.md` — desktop runtime symbols, IPC, and user-facing copy are Podman-named; logical CLI invocations use `podman`.
