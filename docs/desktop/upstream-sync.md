# Upstream sync before merge

**Status:** shipped

This fork (`Johann-Goncalves-Pereira/Qui`) must stay mergeable with upstream
Qui (`autobrr/qui` `develop`). Every pull request targeting `develop` or
`main` runs an **upstream-sync** GitHub Actions check. Order of work:
**sync → merge → CI**.

## Who this is for

Anyone opening or merging PRs on this fork. End users of the downloadable app
do not need this page.

## How the gate works

1. You open a PR into `develop` or `main`.
2. Workflow `.github/workflows/upstream-sync.yml` checks out the PR head.
3. It fetches `https://github.com/autobrr/qui.git` ref `develop`.
4. It runs `git merge --no-commit --no-ff upstream/develop`.
5. **Clean:** the job passes and aborts the merge (no commit left on the runner).
6. **Conflicts:** the job fails, prints conflicted paths, and you must fix the
   branch before merge.

Other CI jobs still run on the PR; treat a red **upstream-sync** as blocking
even if other checks are green. Branch protection should require the
`upstream-sync` / “Merge autobrr/qui develop” check.

## How to keep your branch sync-clean

### Before you open the PR (recommended)

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

### After the check fails on GitHub

1. Open the failed job log and note the listed conflict paths.
2. Locally:

```bash
git fetch upstream develop
git merge upstream/develop
# resolve conflicts in your editor
git add -A
git commit   # merge commit
git push
```

3. Wait for **upstream-sync** to go green, then merge the PR.

## Maintainer: enable the required check

In the fork’s GitHub settings → Branches → protection rule for `develop` (and
`main` if used):

1. Enable **Require status checks to pass before merging**.
2. Add the check named like **Merge autobrr/qui develop** / `upstream-sync`.
3. Do not allow bypassing for admins if you want the gate to always hold.

## Behaviour summary

- Trigger: `pull_request` to `develop` or `main`.
- Upstream remote: `autobrr/qui` @ `develop`.
- Fail closed on merge conflicts; success leaves the PR branch unchanged on the
  runner (merge aborted after a dry-run success).

## Related spec

- `BR-desktop-21` — upstream-sync fails closed on conflicts.
