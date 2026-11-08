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
logo. On the sidebar, the "qui" text is omitted and the logo is pushed to the
right (`ml-auto`), vertically centered with the traffic lights in the 48px row.
When the sidebar is collapsed, the desktop header similarly omits the "qui"
text (keeping only the logo and uncollapse toggle button) and applies 80px left
padding (`lg:pl-20`) with a top-left drag region on macOS desktop to prevent
overlap with native traffic lights, while Windows and standalone browser environments
apply clean 16px padding (`lg:pl-4`).

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

## React 19 View Transitions & Non-Invasive Injection Architecture

To deliver fluid page and action transitions across the Qui desktop and web experience
without modifying original upstream component trees (`web/src/pages/`):

- **Router Page Transitions**: `web/src/router.tsx` sets `defaultViewTransition: true`.
  In `web/src/layouts/AppLayout.tsx`, the main `<Outlet />` is wrapped in a React 19
  `<ViewTransitionBoundary name="page-main-content">` so every route switch cross-fades
  seamlessly using hardware-accelerated View Transition pseudo-elements.
- **Action Transitions in UI Primitives**: Shared Radix wrappers (`TabsContent`,
  `DialogContent`, `SheetContent`, `AccordionContent`) wrap surfaces in
  `<ViewTransitionBoundary>` with stable default names (`dialog-surface`, `sheet-surface`,
  `tab-panel-*`; accordion bodies use React's auto name unless overridden). Upstream pages
  that import `@/components/ui/*` inherit those names without page-level edits. Open/value
  updates that must participate in view transitions should run inside `React.startTransition`
  (router navigations already do via `defaultViewTransition`; custom actions can use the
  helpers below).
- **Action Transition Provider**: `web/src/App.tsx` mounts `<ActionTransitionProvider>`,
  which exposes opt-in `useActionTransition` and `withActionTransition` helpers. It does
  not globally intercept DOM events; callers wrap actions when they need a shared pending
  transition.
- **Accessibility**: `@media (prefers-reduced-motion: reduce)` in `web/src/index.css` disables
  all transition animations when reduced motion is preferred.

## Articulated Vector Rabbit Loading Architecture & Theme Synchronization

To elevate loading states across the application without modifying upstream page component trees (`web/src/pages/`):

- **Articulated Quadruped Vector Rigging**: `web/src/components/ui/AnimatedLogo.tsx` morphs between 5 anatomical keyframe poses (Gather, Launch, Flight Split, Reach & Catch, Pull-Through) with zero external runtime dependencies via CSS `d: path(...)` and SMIL `<animate attributeName="d">` fallbacks.
- **Adaptive Motion Modes**:
  - `sprint`: Full bounding stride with dynamic ground shadow, wind indicators, and subtle outline shimmer (default for splashes and workflow previews).
  - `gallop`: High-cadence scissor stride for fast background synchronization.
  - `jump`: High spring leap for major operations and backups.
  - `turbo`: Articulated bounding rabbit centered within a rotating orbital progress ring for compact spinners, buttons, and modal dialog actions (`RabbitSpinner`).
- **Dynamic Theme Synchronization**: All SVG fills, strokes, shadows, and orbital tracks derive dynamically from active application theme design tokens (`var(--primary)`, `oklch(from var(--primary) l c h / ...)`, and `color-mix(in srgb, var(--primary) ...)`), adapting instantly when switching themes.
- **Non-Invasive UI Primitive Injection**: Shared UI primitives (`SaveFooter`, `Button`, router `defaultPendingComponent`) inject the themed `RabbitSpinner` and `LoadingOverlay` without touching upstream page code, guaranteeing zero git rebase friction against `autobrr/qui`.
- **Accessibility**: `@media (prefers-reduced-motion: reduce)` disables all morphing and translation animations, resting cleanly on the iconic gather brand pose.

## Related specs

- `BR-web-01` in `docs/specs/catalog.md` — desktop biometric gate session flag.
- `BR-web-02` in `docs/specs/catalog.md` — desktop header height lg:h-12 (48px).
- `BR-web-03` in `docs/specs/catalog.md` — status bar footer with streamlined borderless service indicators (`icon dot docker:port`) and relocated chrome.
- `BR-web-04` in `docs/specs/catalog.md` — Docker configuration dialogs (Qui and qBittorrent).
- `BR-web-05` in `docs/specs/catalog.md` — calibrated glassmorphism sidebar translucency.
- `BR-web-08` in `docs/specs/catalog.md` — declarative React 19 `<ViewTransition>` and router view transitions across pages and action boundaries.
- `BR-web-10` in `docs/specs/catalog.md` — sidebar header h-12 brand row with 'qui' text omitted and logo pushed to the right.
- `BR-web-11` in `docs/specs/catalog.md` — articulated vector rabbit loading engine with adaptive motion modes, token-driven theme synchronization, and non-invasive injection.
- `BR-web-12` in `docs/specs/catalog.md` — Radix UI Slot child isolation in Button UI primitive preserving single-element slot contracts.
- `BR-web-14` in `docs/specs/catalog.md` — status bar footer reactively displays Gazelle container indicator when companion is running and opens Gazelle WebUI on click.
- `BR-desktop-05` in `docs/specs/catalog.md` — clear window, 50% page while glass is on.



