---
"isnadibot": patch
---

Opening IsnadiBot in a browser on the same address as T3 Code (both use port 3773) no longer deletes T3 Code's saved connections. Isnadi still copies them in once, but only reads that database and never changes or removes it.
