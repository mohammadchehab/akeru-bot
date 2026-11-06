# Credential vault master key

The vault seals credential values with one 32-byte master key. The server resolves it
(`apps/server/src/vault/masterKey.ts`); the desktop passes nothing.

Sources, first match wins:

1. `ISNADI_MASTER_KEY`: 32 bytes, base64. For headless hosts, CI and tests. A set but malformed value is an error, never a fall-through.
2. The OS keychain: service `isnadibot`, account the sha256 of the canonical `ISNADI_HOME` path.
3. `ISNADI_MASTER_PASSPHRASE` through scrypt. The salt and the scrypt parameters (N=2^17, r=8, p=1) are stored in the home together; they are not secret. A keychain that reports not-found while a passphrase is set and a key check exists falls through to the passphrase, and the key check decides.

With no source the vault is disabled and `set` / `replace` fail with "no master key source".

Rules:

- The key is never written to the home.
- Fail closed: a key is generated only when the keychain answers not-found, the vault holds no sealed records and no key-check record exists. A locked, denied or unreachable keychain is an error, never a reason to regenerate.
- A key-check record (AES-GCM of a constant plus the key id) is stored in the home, so a wrong key gives a clear error and overwrites nothing.
- The running server already holds the home lock, so key generation cannot race a second server.

macOS may ask once to "Always Allow" when the Electron-run and npx-run node processes read the same keychain item.

## Key material in the environment

`ISNADI_MASTER_KEY` and `ISNADI_MASTER_PASSPHRASE` are read once when the server starts and removed from `process.env`, so provider and git child processes never inherit them. Code that builds a child environment from caller input uses `withoutMasterKeyEnv`: git commands and `mergeProviderInstanceEnvironment` (every provider and agent subprocess) both do. The service launcher hands the captured values to the server it starts, the one intended reader. `wsServices.ts` only reads the environment and spawns nothing. A passphrase must be at least 12 characters. Sealed records without a key check are never re-blessed by a new key.

`ISNADI_MASTER_KEY` is for headless and CI installs only. On a desktop the keychain is the key source; do not put a long-lived key in a shell profile.

A process running as the same uid can still read the key from `/proc/<pid>/environ` or `ps eww` while the server runs with the env source; the env strip protects children, not same-uid peers.

## Persistence and the keychain adapter

Credentials persist in one file under the Isnadi home (`vault.json`, mode 0600, written to a temp file and renamed). It holds the scrypt parameters, the key-check record and one sealed value per credential. A sealed value is AES-256-GCM with the credential id as associated data, stored as `iv.tag.body` in base64, so a value cannot be moved to another id. A wrong key, wrong id or edited value opens to nothing; no plaintext ever reaches the file.

Scrypt parameters are read back from the file, so they are bounded before use (N up to 2^20, r up to 16, p up to 4, salt at least 16 bytes); anything else fails closed as `kdf-params-out-of-bounds`.

`@napi-rs/keyring` backs `KeychainPort` (`keychainAdapter.ts`). The item is per Isnadi home, so a dev home never reads the real install's key. No keyring on the platform is `unavailable` (the chain falls to the passphrase), a missing item is `not-found`, and a locked, denied or corrupt item is `error` (never regenerates). `ISNADI_REAL_KEYCHAIN_TEST=1` enables the real macOS keychain test on a developer machine.

## Startup

`VaultService` (`vault/VaultService.ts`) opens the vault once per server start, after `ServerHomeLock` is held, so key generation cannot race a second server. It reads key material from `capturedMasterKeyEnv`, never `process.env`, and keeps the vault file at `<stateDir>/vault.json`. The result is `ready` (with the write-only `SecretVault` and the broker-only `SecretReader`) or `disabled` with a reason: no master key source, a wrong or missing key, or an unreadable file. A disabled vault never stops the server; it logs the reason (never key material) and runs without credentials. `openVault` does the work and never throws.
