# Tracking issues in an independent Git branch

We want to store changes made to issues in a separate part of the repo, so different people can work on different branches while accessing a shared issue pool no matter in what branch they are.

The idea is still to keep the plain-text folder `.agentrack` that you can read, edit, and grep, but it's tracked on its own branch independent of your code.

All this branch management should be handled in an easy way by using agentrack's `agt` CLI command:

* `agt init` should set up the git branch and worktree for you
* `agt pull` and `agt push` should sync the issues by pushing/pulling the `_agentrack` branch, without affecting your current code branch

## How would it work internally

`agt init` needs to handle two scenarios:

### Scenario A: Fresh setup (no `_agentrack` branch on remote)

This is the first person in the repo using agentrack. Steps:

1. Create an orphan branch named `_agentrack` where the issues will be stored. An orphan branch has no shared history with main — it's a parallel root.

```bash
# from your repo root, on main:
git checkout --orphan _agentrack
git rm -rf .                       # empty the index (main's files are still on disk)
# now we should generate the .agentrack folder structure with the initial files (index.json, config.json, etc)
git add -A
git commit -m "init _agentrack branch"
git push -u origin _agentrack
```

2. Go back to main and gitignore the future mount point.

```bash
git checkout main
echo "/.agentrack/" >> .gitignore
git add .gitignore
git commit -m "ignore .agentrack worktree"
```

3. Mount the `_agentrack` branch as a worktree at `.agentrack/`.

```bash
git worktree add .agentrack _agentrack
```

### Scenario B: Join existing (`_agentrack` branch already on remote)

A new developer clones the repo (or a teammate who hasn't set up agentrack yet). The `_agentrack` branch already exists on the remote — they just need to fetch it and mount it.

1. Fetch the remote branch and create a local tracking branch.

```bash
git fetch origin _agentrack
git branch _agentrack origin/_agentrack   # local branch tracking remote
```

2. Ensure `.agentrack/` is gitignored (should already be in `.gitignore` since the first person added it, but verify and add if missing).

3. Mount the worktree.

```bash
git worktree add .agentrack _agentrack
```

### How `agt init` decides which path to take

```
git ls-remote --heads origin _agentrack
```

- Empty output → Scenario A (fresh setup)
- Returns a ref → Scenario B (join existing)

That's it. Your directory now looks like:

```
my-repo/
├── .git/
├── .gitignore          # ignores /.agentrack/
├── src/                # tracked on main
├── README.md           # tracked on main
└── .agentrack/         # checked out from the `_agentrack` branch
    ├── .git            # a *file*, not a dir — points back to ../.git/worktrees/.agentrack
    ├── config.json
    ├── index.json
    ├── dependencies.json
    ├── users.json
    └── issues/
        ├── mp3pe95w9e.json
        └── mp3peanz8b.json
```

How it behaves day-to-day:

```bash
# in the repo root — you're on main, .agentrack is just an ignored folder
git status                # clean, .agentrack invisible
git checkout feature-x    # switches code branches; .agentrack stays put

# step into .agentrack — now you're on the `_agentrack` branch
cd .agentrack
git status                # shows the _agentrack branch's state
# (normally `agt` commands handle file writes, but you can also edit directly)
git add issues/mp3pe95w9e.json
git commit -m "update issue"
git push                  # pushes the _agentrack branch, independent of code
```

Why this works well for your case:

- **One repo, one remote, one clone.** The `_agentrack` branch is in the same repo as main, so `git clone` brings down both. After cloning, teammates run `git worktree add .agentrack _agentrack` once and they're set.
- **Plain text.** Files in `.agentrack/` are real files — grep them, open in your editor, render on GitHub (browse the `_agentrack` branch in the web UI).
- **Branch-independent.** When someone switches from `main` to `feature-x`, the `.agentrack` worktree doesn't change. Everyone sees the same issues regardless of what code branch they're on.
- **Normal push/pull.** Issues sync with `git push`/`git pull` from inside `.agentrack/` — no custom refspecs.

Things to know:

- Two people editing the same issue file on the `_agentrack` branch will conflict on push, exactly like any branch. That's why the append-only event-log format per issue is still a good idea — it makes merges painless.
- The `.git` inside `.agentrack` is a file containing a pointer, not a directory. Don't delete it manually; use `git worktree remove .agentrack` if you ever want to tear it down.
- You can't check out the same branch in two worktrees simultaneously. Not usually a problem here since the `_agentrack` branch only lives in the `.agentrack` worktree.
- New clones don't auto-create the worktree. Add a one-line setup script or a note in your README: `git worktree add .agentrack _agentrack`.

This is genuinely the sweet spot for what you described: branchable code, single-source-of-truth issues, all in one repo, all readable as plain text.
