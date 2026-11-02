---
"isnadibot": patch
---

Isnadi no longer reads `T3CODE_HOME`, which belongs to T3 Code, as its data directory. With only `T3CODE_HOME` set, the server, desktop app and dev runner now use `~/.isnadi` (or the worktree's `.isnadi`) and log one warning that names `ISNADI_HOME`. Set `ISNADI_HOME` to use another folder.
