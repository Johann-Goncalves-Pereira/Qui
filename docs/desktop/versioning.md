# Qui Desktop Semantic Versioning

Qui Desktop follows a linear semantic versioning scheme (`MAJOR.MINOR.PATCH`).

## Baseline and Progression

1. **Initial Baseline:** `0.0.0` defined in `desktop/package.json`.
2. **Automated PR Merge Increment:** Every merged Pull Request into `develop` or `main` automatically increments the patch version (`0.0.1`, `0.0.2`, `0.0.3`, ...).
3. **Bridge Exposure:** The desktop Electron preload bridge exposes `window.quiDesktop.getAppVersion()`, which directly reads the packaged desktop application version.
4. **Bare Display:** In the web UI status bar footer, the version is displayed as the bare semver string (e.g. `0.0.0`, `0.0.1`) without extraneous prefixes such as `"Version "` or development tokens like `"desktop-local"`.
5. **Standalone Browser Fallback:** When running directly in a web browser without the Electron preload bridge, the web app falls back gracefully to `0.0.0` or upstream `window.__QUI_VERSION__` without throwing errors.

## Automation & Workflows

- `.github/workflows/desktop-version-bump.yml`: GitHub Actions workflow triggered whenever a PR is closed and merged into `develop` or `main`. It increments the patch version in `desktop/package.json`, creates a matching git tag `v<version>`, and commits back with `[skip ci]`.
- `desktop/scripts/bump-version.mjs`: Script to execute the patch increment locally or in CI (`node desktop/scripts/bump-version.mjs [--dry-run]`).
