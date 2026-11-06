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

The host policy is `denyAllHostPolicy`: until the per-profile grant store exists, every `open` is refused with `host-not-granted` before any TCP. Wiring the grant store is the follow-up that makes egress usable.
