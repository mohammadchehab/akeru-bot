---
"isnadibot": patch
---

SSH hosts whose alias, hostname or username starts with "-" or contains whitespace or control characters are now rejected, and SSH connections end their options with "--" so a host name can never be read as an ssh option.
