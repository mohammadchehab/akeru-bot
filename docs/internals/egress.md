# Egress transport

A server-side browser can reach the network only through the user's desktop. The desktop resolves and pins the address; the server never dials.

## Routes

- `GET /egress` is the control WebSocket. One per desktop. It carries `open` frames down and `refused` / `closed` frames up (`packages/contracts/src/egress.ts`).
- `GET /egress/stream/:streamId?ticket=` is one WebSocket per CONNECT stream, carrying raw bytes.

Both require a session whose scopes are exactly `[egress:provide]`. It is granted only by the separate `egress-provider` grant, whose token the desktop main process keeps (`bootstrap.egressProviderToken`) and never gives to a renderer or any other credential. The desktop exchanges that token asking for `egress:provide` alone.

## Server: `EgressBroker`

`open` fails closed with `ProviderGone` when no control socket is registered or when it drops mid-stream. Each `open` mints a stream id and a ticket: single-use, ten seconds, bound to (owner, stream id). The server's host, port, and profile are advisory.

## Desktop: `EgressProvider`

Every `open` goes through `openEgressTarget` (`EgressDialer`), so a blocked address is refused before any TCP. Limits: 64 streams per session, five minutes idle, 5 MiB/s token bucket (`EgressLimits`).

## Desktop: `DesktopEgress`

`forkDesktopEgress` (started from `DesktopApp.bootstrap`) exchanges the egress provider token for an `[egress:provide]` bearer, opens the `/egress` control socket, and serves `open` frames with `makeEgressProvider`. It dials with `dns.lookup` (all addresses, verbatim) and `node:net`, reads the PC's interface CIDRs fresh on every open, and opens `/egress/stream/:id?ticket=` for each stream. When the control socket closes it destroys every live stream, then reconnects with a 1s, 5s, 30s backoff (reset after a connection that held for a minute). The WSL backend has no egress token and does not provide egress.

### Egress grants

The host policy is `DesktopEgressGrants.policyFor(PRIMARY_INSTANCE_ID)` (`EgressGrantStore.ts`). The server's `profileId` is never trusted alone: the desktop keeps a binding from its own backend instance id to the profile ids that backend may serve, and a profile outside that binding is refused with `host-not-granted` before any DNS or TCP. Grants live per profile in `egress-grants.json` in the desktop state directory (mode 0600, written to a temporary file and renamed, one write at a time).

A grant is an exact host or a wildcard. Hosts are normalized (case, trailing dot, numeric IPv4 spellings, brackets); a host that does not parse is refused. A wildcard for `example.com` allows `example.com` itself and every subdomain, on a label boundary only (`evil-example.com` and `example.com.evil.com` do not match), and never matches an IP literal. A wildcard on a public suffix, a single label or an IP-shaped value is refused when it is saved. A grant is not an address allowlist: a granted name that resolves to a private, loopback, link-local, metadata or interface-subnet address is still blocked.

A file that fails to decode means deny everything (`status` is `unreadable`). It is never rewritten implicitly and writes are refused until `reset()` replaces it. Revoking a grant, changing a binding or resetting publishes a revocation; the provider re-evaluates its live streams of that profile and ends the ones that are no longer allowed, including a dial still in flight. The owner's grant, list and revoke interface is a follow-up.
