# Companion qBittorrent authentication bypass

**Status:** shipped

Qui Desktop pre-seeds companion `qBittorrent.conf` on first install (`BR-desktop-22`) so the `qui` container can reach `qbittorrent-nox` without hitting ephemeral session passwords or IP bans. qBittorrent 4.6.1+ still enforces WebUI login for clients outside the configured subnet whitelist.

## Failure mode

When `qbittorrent-nox` creates or mutates `qBittorrent.conf` before Qui's pre-seed runs, or when an older desktop build wrote auth keys under the wrong section, the file on disk can lack `WebUI\AuthSubnetWhitelistEnabled` under `[Preferences]`. `ensureQbitPreseedConfig` previously returned without patching, so upgrades and reinstalls kept failing health checks until the user manually edited config or set instance credentials (`BR-web-16`, `BR-desktop-43`).

## Patch on startup

Before aligning the companion container, Qui Desktop merges missing auth-bypass preference keys into an existing `qBittorrent.conf` when the whitelist flag is absent. User-edited values are preserved once the flag is present.

## Spec

- `BR-desktop-46` in `docs/specs/catalog.md` — legacy companion `qBittorrent.conf` patched with subnet auth bypass when missing.
