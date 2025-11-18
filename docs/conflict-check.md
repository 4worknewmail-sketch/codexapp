# Git conflict sanity check

If you see errors like `<<<<<<< codex/...` when trying to commit, run these commands from the repo root to confirm no conflict markers remain:

```bash
rg "^<<<<<<<"
rg "^======="
rg "^>>>>>>>"
```

If any matches appear, open the reported files, pick the correct changes, delete the conflict marker lines, and then stage the fixes:

```bash
git add <file>
git commit
```

In this repository, a quick scan shows **no unresolved conflict markers**, so you should be able to commit normally once your working tree has real changes staged.
