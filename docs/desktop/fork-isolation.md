# Fork isolation from upstream Qui

**Status:** in progress

This fork (`Johann-Goncalves-Pereira/Qui`) keeps desktop behaviour while staying
mergeable with `autobrr/qui` `develop`. Isolation means **fork-owned modules**
plus **thin injection** in upstream-owned files—not large patches inside
high-churn upstream paths.

## Principle

- **Desktop** (`window.quiDesktop`): same UI and features as today.
- **Standalone browser on this fork**: may match upstream layout where the fork
  used to override everyone. That is isolation, not a desktop regression.
- Gate chrome with `useIsDesktop()` / `isDesktopEnvironment()`.

## Where fork code lives

| Concern | Fork-owned location | Upstream file keeps |
| --- | --- | --- |
| Desktop i18n | `web/src/i18n/locales/*/desktop.json` | `namespaces` entry in `web/src/i18n/index.ts` |
| Glass / view-transition CSS | `web/src/desktop.css` | `@import "./desktop.css"` in `index.css` |
| Makefile desktop / sync targets | `mk/fork.mk` | `-include mk/fork.mk` |
| Desktop update banner branch | `DesktopUpdateBanner.tsx` | one `isDesktop` return in `UpdateBanner.tsx` |
| License env overrides | `license_env_override.go` | one-line helper calls in `license_service.go` |
| Layout chrome hooks | `web/src/lib/desktop-*.ts`, desktop components | one mount or hook call per layout file |
| Header and sidebar chrome | `web/src/hooks/useDesktopChrome.ts`, `useDesktopSidebarChrome.ts` | `useDesktopChrome` in `Header.tsx`, `useDesktopSidebarChrome` in `AppLayout.tsx`; `Sidebar.tsx` gates its brand row with `useIsDesktop()` |
| Root update and shell hosts | `web/src/components/DesktopShellHost.tsx` | `__root.tsx` renders `RootLayout` inside it |
| Theme side effects (glass, `syncTheme`) | `web/src/lib/desktop-theme.ts` | one `onThemeApplied(...)` call in `utils/theme.ts` |
| Podman credentials guide | `web/src/components/instances/DesktopAuthRemediationCard.tsx` | one desktop-gated mount in `InstanceErrorDisplay.tsx` |

Do not add new desktop strings to shared `common.json` / `settings.json` /
`instances.json` / `auth.json`. Prefer `desktop.json`.

Do not grow mid-file hunks in `Header.tsx`, `Sidebar.tsx`, `AppLayout.tsx`,
`UpdateBanner.tsx`, or `index.css`. Extract, then leave a one-line inject.

## Thin injection (phase 2)

Off the desktop shell, `Header`, `Sidebar`, and `InstanceErrorDisplay` render
the upstream layout: standard-mode `lg:h-16` header, sidebar brand row with the
`qui` text, and no Podman credentials guide. With `window.quiDesktop`, the
hooks return the desktop overrides (logo-only brand, `lg:h-12`, traffic-light
clearance and drag regions), so the desktop look does not change.

## Sync tooling

See [upstream-sync.md](upstream-sync.md):

- Locale JSON conflicts under `web/src/i18n/locales/` deep-merge automatically
  when possible.
- `scripts/fork-upstream-hotspots.txt` lists upstream paths the fork may still
  touch. New upstream paths outside the allowlist and outside fork-owned
  prefixes fail the local sync gate.

## Related spec

- `BR-desktop-57` — fork desktop patches live in fork-owned modules with thin
  upstream injection.
- `BR-desktop-59` to `BR-desktop-63` — desktop chrome hooks, shell host, theme
  hook, and Podman credentials panel keep upstream output off the desktop.
- `BR-desktop-58` — sync gate auto-merges locale JSON and enforces the hotspot
  allowlist.
