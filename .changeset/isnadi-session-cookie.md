---
"isnadibot": patch
---

Isnadi now names its browser session cookie `isnadi_session` instead of `t3_session`. Sessions created before the update keep working: the old cookie is still accepted and replaced with the new one the next time the page checks the session.
