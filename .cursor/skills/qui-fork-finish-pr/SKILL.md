---
name: qui-fork-finish-pr
description: >-
  Finish-PR for the Qui Desktop fork (Johann-Goncalves-Pereira/Qui): local
  upstream-sync, squash-merge, then local desktop version bump + tag without
  GitHub Actions ($0 spend). Use when the user invokes finish-pr, SM, squash
  merge, /finish-pr-workflow, or asks to merge a PR on this repository.
argument-hint: "[PR number]"
user-invocable: true
disable-model-invocation: false
---

# Qui Fork Finish PR ($0 Actions)

Replaces reliance on GitHub Actions for gates that are budget-blocked. Global
`$finish-pr-workflow` still does SM + sync base; **on this repo** you must also
follow this skill end-to-end.

**Docs:** `docs/desktop/upstream-sync.md`, `docs/desktop/versioning.md`  
**Specs:** `BR-desktop-21`, `BR-desktop-28`, `BR-desktop-42`

## Order (do not skip)

```text
1. Local upstream-sync on the PR head (feature branch / worktree)
2. Squash-merge the PR (finish-pr SM)
3. Checkout + pull base (develop/main)
4. Synchronize fork base with upstream autobrr/qui develop (make upstream-sync-fork)
5. Local desktop version bump (unless skip rules below)
```

## Phase A — Upstream sync

Read and follow `$qui-fork-local-upstream-sync`:

```bash
make install-hooks   # once if needed
# on feature branch or: git -C <worktree> …
make upstream-sync   # must exit 0
```

Do **not** wait for `Merge autobrr/qui develop` on GitHub.

## Phase B — Squash merge (finish-pr)

Same as global finish-pr:

```bash
gh pr merge <n> --squash --delete-branch
git fetch origin && git checkout "$BASE" && git pull origin "$BASE"
```

Hard rules from finish-pr still apply (no `--admin` unless asked, no force-push,
smart-mode approval retry on merge block).

If the PR title is already `Chore 🔧: Bump Desktop Version to …`, **stop after
Phase B** (do not bump again).

## Phase C — Fork upstream synchronization (BR-desktop-42)



On this repository, **finish-pr must always synchronize the fork** with upstream `autobrr/qui` `develop`:

```bash
make upstream-sync-fork
# or: ./scripts/upstream-sync-fork
```

This verifies zero conflicts, opens a sync PR if behind upstream, merges it with `--merge` (preserving git commit ancestry so GitHub's behind counter resets to 0), and updates local `develop`.

## Phase D — Version bump + tag ($0 spend)

On clean `develop` / `main` after the feature SM and upstream fork sync:


```bash
./scripts/desktop-version-bump-local
# or: make desktop-version-bump
```

This opens a bump PR (also updates `Casks/qui.rb`), squash-merges it, pushes
`v<ver>`, and runs `desktop-publish-release-local` so GitHub **Latest** matches
the desktop semver.

Build assets when you need downloadable `.dmg`/`.zip` (before or after bump):

```bash
pnpm --dir desktop package:mac:release
./scripts/desktop-publish-release-local
```

Publish the **fork GUI Docker image** so downloadable apps do not pull upstream:

```bash
# once per machine: gh auth refresh -s write:packages,read:packages,repo,workflow
make desktop-publish-qui-image
```

Packaged Electron defaults to `ghcr.io/johann-goncalves-pereira/qui:latest`
(not `autobrr/qui`). Without that push, new machines cannot get Glassmorphism /
StatusBarFooter / Gazelle UI.

Never leave a mismatched marketing tag (e.g. `v1.0.0`) as Latest while
`desktop/package.json` is `0.0.x` — the in-app updater uses `/releases/latest`.

Skip Phase D (version bump) when:

- `QUI_SKIP_DESKTOP_VERSION_BUMP=1`
- The PR you just merged was itself a desktop version bump
- User explicitly said not to bump

## Phase E — Verify Release & Homebrew Cask Availability (BR-desktop-48)

Before finishing the project, verify that the bump release is fully usable and does not produce 404 or alert errors:

1. **Verify GitHub Release Assets:** Ensure `gh release view "v<ver>" --json assets` contains `Qui-<ver>-arm64.dmg`, `Qui-<ver>-arm64-mac.zip`, and `qui-desktop-image-arm64.tar.gz`. Assets array must never be empty.
2. **Verify DMG Download:** `curl -ILs -o /dev/null -w "%{http_code}" https://github.com/Johann-Goncalves-Pereira/Qui/releases/download/v<ver>/Qui-<ver>-arm64.dmg` must return `200`.
3. **Verify Homebrew Cask:** `brew fetch --cask johann-goncalves-pereira/qui/qui` must succeed with exit code 0 and no deprecation warnings (`postflight_steps do` used).
4. **Verify Clean Startup (No Alert Prompts):** Ensure `desktop/src/main/index.ts` does not contain automatic startup update modal prompts.

## Checklist

```text
[ ] upstream-sync clean on PR head
[ ] gh pr merge N --squash --delete-branch
[ ] on develop/main, pulled
[ ] ./scripts/upstream-sync-fork             # ensure 0 commits behind upstream
[ ] ./scripts/desktop-version-bump-local     # unless bump PR / skip
[ ] verify release assets: Qui-<ver>-arm64.dmg exists on GitHub release (HTTP 200)
[ ] verify brew fetch --cask qui succeeds without 404 or deprecation warnings
[ ] SetActiveBranch to base
[ ] report feature PR URL + bump version/tag
```

## Related

- Scripts: `scripts/upstream-sync-fork`, `scripts/desktop-version-bump-local`, `scripts/desktop-publish-release-local`, `scripts/upstream-sync-check`
- Rule: `.cursor/rules/510-local-upstream-sync.mdc`
- Sibling: `$qui-fork-local-upstream-sync`, `$qui-fork-issue-crafting`

