---
name: qui-fork-local-upstream-sync
description: >-
  Local upstream-sync gate for the Qui Desktop fork (Johann-Goncalves-Pereira/Qui).
  Runs make upstream-sync / scripts/upstream-sync-check and .githooks pre-push rules
  instead of GitHub Actions. Use when pushing feature branches, opening or
  squash-merging PRs into develop, syncing with autobrr/qui, finishing a PR, or
  when Actions status checks / Merge autobrr/qui develop are missing or blocked.
argument-hint: "[--check|--install-hooks|--sync-branch]"
user-invocable: true
disable-model-invocation: false
---

# Qui Fork Local Upstream Sync

**Read full how-to:** `docs/desktop/upstream-sync.md` (`BR-desktop-21`).

This fork does **not** use GitHub Actions for the upstream merge probe. The
account Actions budget is **$0 / Usage blocked**. Do not wait for a status check
named `Merge autobrr/qui develop` — it will not run.

Gate order: **sync locally → push feature branch → PR → squash-merge**.

## When to run this skill

- Before `git push` on a feature branch
- Before `gh pr merge --squash` / finish-pr / SM
- When the user says sync upstream, upstream-sync, or Actions is disabled
- When a PR is **BLOCKED** only because a required Actions check never started

## One-time per clone

```bash
make install-hooks
# or: ./scripts/install-local-hooks
```

Sets `core.hooksPath=.githooks` (shared by worktrees). Hooks then:

1. **Reject** direct pushes to `develop` / `main`
2. **Run** `./scripts/upstream-sync-check` before other branch pushes

## Before every push or squash-merge

On the **feature branch** (never on `develop`):

```bash
make upstream-sync
# or: ./scripts/upstream-sync-check
```

| Result | Meaning | Next step |
| --- | --- | --- |
| exit 0 | Clean dry-merge with `autobrr/qui` `develop` | Push / SM |
| exit 1 | Conflicts | Merge or rebase upstream into the **feature** branch, fix, re-run |

Conflict recovery:

```bash
git fetch https://github.com/autobrr/qui.git develop
git merge FETCH_HEAD
# fix conflicts, commit
make upstream-sync
git push
```

## Hard rules

1. **Never** `git push origin develop` (or `main`). Open a PR; squash-merge only.
2. **Never** disable or weaken local hooks to dodge the gate.
3. **Never** require or poll GitHub Actions for this gate while usage is blocked.
4. **Never** merge upstream into local `develop` and push it — sync on the feature branch, then PR. Base branch sync uses `scripts/upstream-sync-fork` (via PR with merge commit `--merge`).
5. If checkout fails with “already used by worktree”, run commands in that worktree path (or `git -C <worktree> …`) — do not stay on `develop` and push there.
6. GitHub ruleset **Protect develop** may still: restrict deletions, block force pushes, require PR + squash. It must **not** require Actions status checks (empty check list is correct).
7. Fork-bug policy unchanged: only fix CI/lint failures caused by *this* fork work; ignore upstream-identical or pre-existing unrelated red checks when Actions eventually runs again.
8. **Always sync upstream on finish-pr:** running `$finish-pr-workflow` must always sync `develop` with `autobrr/qui` `develop` (`make upstream-sync-fork`) so this fork is never left behind upstream.

## Agent checklist (copy)

```text
[ ] make install-hooks   # if core.hooksPath is unset
[ ] on feature branch (or its worktree)
[ ] make upstream-sync   # must exit 0
[ ] git push             # pre-push re-runs the check
[ ] gh pr merge N --squash --delete-branch
[ ] checkout/pull develop (gcdp / BASE=develop)
[ ] make upstream-sync-fork   # always sync fork with upstream autobrr/qui:develop
[ ] ./scripts/desktop-version-bump-local   # see $qui-fork-finish-pr (skip if bump PR)
```

## Related

- Spec: `BR-desktop-21`, `BR-desktop-40` in `docs/specs/catalog.md`
- Rule: `.cursor/rules/510-local-upstream-sync.mdc`
- Sibling: `$qui-fork-finish-pr` (SM + version bump), `$qui-fork-issue-crafting`
- Scripts: `scripts/upstream-sync-fork`, `scripts/upstream-sync-check`, `scripts/install-local-hooks`, `.githooks/pre-push`


