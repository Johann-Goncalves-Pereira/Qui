# Fork-only targets (Qui Desktop). Included from the root Makefile so upstream merges stay conflict-free.

.PHONY: desktop-dev desktop-refresh desktop-version-bump desktop-publish-release desktop-publish-qui-image upstream-sync upstream-sync-fork install-hooks

# Electron shell against Vite with all dependencies orchestrated in hot-reload mode.
desktop-dev:
	./desktop-dev.sh

# Rebuild qui-desktop:local, recreate container, clear Electron caches.
desktop-refresh:
	./scripts/desktop-refresh

# Dry-merge autobrr/qui develop into HEAD (local gate; no GitHub Actions).
upstream-sync:
	./scripts/upstream-sync-check

# Synchronize develop with autobrr/qui develop via PR with merge commit (--merge).
upstream-sync-fork:
	./scripts/upstream-sync-fork

# After squash-merge: bump desktop patch via PR + tag (no Actions; $0 spend).
desktop-version-bump:
	./scripts/desktop-version-bump-local

# Publish/refresh GitHub Release Latest for current desktop/package.json version.
desktop-publish-release:
	./scripts/desktop-publish-release-local

# Build+push fork Qui Docker image (GUI) to lowercase GHCR for downloadable apps.
desktop-publish-qui-image:
	./scripts/desktop-publish-qui-image

# Install committed .githooks (blocks develop push; runs upstream-sync on push).
install-hooks:
	./scripts/install-local-hooks
