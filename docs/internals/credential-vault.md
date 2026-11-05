# Credential vault master key

The vault seals credential values with one 32-byte master key. The server resolves it
(`apps/server/src/vault/masterKey.ts`); the desktop passes nothing.

Sources, first match wins:

1. `ISNADI_MASTER_KEY`: 32 bytes, base64. For headless hosts, CI and tests. A set but malformed value is an error, never a fall-through.
2. The OS keychain: service `isnadibot`, account the sha256 of the canonical `ISNADI_HOME` path.
3. `ISNADI_MASTER_PASSPHRASE` through scrypt. The salt is stored in the home; it is not secret.

With no source the vault is disabled and `set` / `replace` fail with "no master key source".

Rules:

- The key is never written to the home.
- Fail closed: a key is generated only when the keychain answers not-found, the vault holds no sealed records and no key-check record exists. A locked, denied or unreachable keychain is an error, never a reason to regenerate.
- A key-check record (AES-GCM of a constant plus the key id) is stored in the home, so a wrong key gives a clear error and overwrites nothing.
- The running server already holds the home lock, so key generation cannot race a second server.

macOS may ask once to "Always Allow" when the Electron-run and npx-run node processes read the same keychain item.
