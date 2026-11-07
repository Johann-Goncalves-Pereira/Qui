# Upstream sync before merge

**Status:** shipped

This fork (`Johann-Goncalves-Pereira/Qui`) must stay mergeable with upstream
Qui (`autobrr/qui` `develop`). The gate runs **on your machine** (git hooks +
script), not on GitHub Actions — Actions is budget-blocked at $0. Order of
work: **sync → push → open/merge PR**.

## Who this is for

Anyone opening or merging PRs on this fork (including agents). End users of the
downloadable app do not need this page.

## One-time setup

From the repo root (shared by all worktrees):

```bash
./scripts/install-local-hooks
# or: make install-hooks
```

That sets `core.hooksPath` to `.githooks` so:

1. **pre-push** rejects direct pushes to `develop` / `main` (use a PR).
2. **pre-push** runs `./scripts/upstream-sync-check` before any other branch
   push — fail closed if `autobrr/qui` `develop` would conflict.

## How the gate works

```bash
make upstream-sync
# or: ./scripts/upstream-sync-check
```

1. Fetches `https://github.com/autobrr/qui.git` ref `develop`.
2. Dry-merges that tip into `HEAD` with `git merge-tree --write-tree` (no dirty
   index, no merge commit).
3. **Clean:** exit 0.
4. **Conflicts:** exit 1 and print conflicted paths — merge or rebase upstream
   into your feature branch, fix, then push again.

Agents and humans must run this (or rely on the installed pre-push hook) before
squash-merging a PR. Do **not** require a GitHub Actions status check for this
gate while Actions usage is blocked.

## How to keep your branch sync-clean

### Before you push (recommended)

```bash
git remote add upstream https://github.com/autobrr/qui.git   # once
git fetch upstream develop
git checkout your-feature-branch
git merge upstream/develop
# fix conflicts, run tests, commit
git push
```

Or rebase if you prefer (same conflict rule):

```bash
git fetch upstream develop
git rebase upstream/develop
# fix conflicts, git rebase --continue
git push --force-with-lease   # only on your feature branch
```

### After the local check fails

1. Note the conflicted paths printed by `upstream-sync-check`.
2. On the feature branch (never on `develop`):

```bash
git fetch upstream develop
git merge upstream/develop
# resolve conflicts
git add -A
git commit
git push
```

3. Re-run `make upstream-sync` until it passes, then open or merge the PR.

## GitHub ruleset (optional, no Actions)

With Actions usage blocked, **do not** require the old
`Merge autobrr/qui develop` status check — it can never go green.

Keep a lightweight ruleset on `develop` if you want:

- Restrict deletions
- Block force pushes
- Require a pull request (squash only)

Remove **Require status checks** (or disable that ruleset rule) so agents can
squash-merge after the **local** upstream-sync gate passes.

## Fork upstream synchronization on finish-PR (BR-desktop-42)

On this repository, running `$finish-pr-workflow` (or manual finish-pr / SM) **must always synchronize the fork** with `autobrr/qui` `develop`.

Dry-merging on the feature branch (`upstream-sync-check`) only proves mergeability. When upstream commits land independently, `Johann-Goncalves-Pereira/Qui:develop` drifts behind upstream (e.g. "2 commits behind autobrr/qui:develop").

To eliminate this divergence:
1. `scripts/upstream-sync-fork` probes commit distance between `origin/develop` and `autobrr/qui:develop`.
2. When behind by $\ge 1$ commits:
   - Validates that merge-tree has zero conflicts.
   - Creates a sync branch `sync/upstream-develop` (or dedicated sync branch).
   - Merges upstream tip into the sync branch using a true merge commit.
   - Pushes and opens a sync PR into `develop`.
   - Merges the PR with `gh pr merge --merge --delete-branch` (using `--merge`, not `--squash`, so GitHub's upstream commit ancestry is recorded and the "behind upstream" counter resets to 0).
   - Pulls updated `origin/develop`.
3. This is integrated directly into `$qui-fork-finish-pr`, `scripts/desktop-version-bump-local`, and `make upstream-sync-fork`.

## Behaviour summary

- Trigger: local `pre-push` hook and/or `make upstream-sync` (dry-merge check on feature branch).
- Finish-PR sync: `make upstream-sync-fork` / `scripts/upstream-sync-fork` (enforces 0 commits behind).
- Upstream: `autobrr/qui` @ `develop`.
- Fail closed on merge conflicts; success keeps fork in parity with upstream.
- No GitHub Actions workflow for this gate (avoids metered Actions usage).

## Agent skill

Agents: follow `.cursor/skills/qui-fork-local-upstream-sync/SKILL.md` and `.cursor/skills/qui-fork-finish-pr/SKILL.md` (also
linked from `AGENTS.md`). On this fork, finish-PR workflows must always invoke or verify upstream fork synchronization.

## Related spec

- `BR-desktop-21` — local upstream-sync fails closed on conflicts.
- `BR-desktop-42` — fork finish-PR workflow enforces upstream synchronization via `upstream-sync-fork`.



