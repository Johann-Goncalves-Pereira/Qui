# Web + Electron desktop shell

**Status:** in progress

When Qui runs inside the desktop Electron wrapper, the preload exposes
`window.quiDesktop.requestTouchId`. After a successful **login** or **first-time
registration**, the web app sets a session flag so the **authenticated** layout
runs a **one-time** Touch ID prompt. In a normal browser nothing is injected and
no prompt runs.

The Glassmorphism slider calls `window.quiDesktop.setWindowMaterial` with a
boolean: true when the theme color is below 100%, false at 100%. The native
window stays clear either way. Below 100%, the page shell, sidebar, cards, and
popovers keep that percentage of the active theme, and the shell turns on HUD
vibrancy so the desktop behind the window is blurred. To maintain contrast and
prevent heavy muddiness over macOS HUD vibrancy, the main navigation sidebar and
filter sidebar panels apply a calibrated lighter surface blend and translucency
scale. At 100% the page is solid and vibrancy is off. In a normal browser the
helper does nothing. Glassmorphism is not its own theme.

Setup and sign-in call `saveAccount`. On the login page, `unlockAccount` asks
for Touch ID and returns the saved username and password. Pages that show the
sidebar call `setSidebarChrome(true)` so the traffic lights line up with the
logo.

## Desktop Header Height & Docker Layout Resilience

This project is a fork of Qui providing an Electron desktop shell around the
underlying Qui web app. Because the layout rendered inside the desktop app
follows what the web app/Docker image serves, layout customizations must remain
compatible with upstream changes:

- **Header height**: The desktop header renders at `lg:h-12` (48px) in both
  standard and dense view modes. This lines up with the `h-12` top brand row in
  the desktop sidebar and reclaims vertical screen real estate for the dashboard
  and torrent tables.
- **Resilience**: The layout structure avoids hardcoded structural assumptions
  that would break if upstream Qui updates its navigation or header hierarchy.

## Related specs

- `BR-web-01` in `docs/specs/catalog.md` — desktop biometric gate session flag.
- `BR-web-02` in `docs/specs/catalog.md` — desktop header height lg:h-12 (48px).
- `BR-web-03` in `docs/specs/catalog.md` — status bar footer with streamlined borderless service indicators (`icon dot docker:port`) and relocated chrome.
- `BR-web-04` in `docs/specs/catalog.md` — Docker configuration dialogs (Qui and qBittorrent).
- `BR-web-05` in `docs/specs/catalog.md` — calibrated glassmorphism sidebar translucency.
- `BR-desktop-05` in `docs/specs/catalog.md` — clear window, 50% page while glass is on.
