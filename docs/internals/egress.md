# Egress transport

A server-side browser can reach the network only through the user's desktop. The desktop resolves and pins the address; the server never dials.

## Routes

- `GET /egress` is the control WebSocket. One per desktop. It carries `open` frames down and `refused` / `closed` frames up (`packages/contracts/src/egress.ts`).
- `GET /egress/stream/:streamId?ticket=` is one WebSocket per CONNECT stream, carrying raw bytes.

Both require the user-only scope `egress:provide`. It is granted only by the desktop-bootstrap seed (`AuthDesktopBootstrapScopes`), never to standard, administrative, bot, or pairing credentials. The desktop should exchange its bootstrap token asking for `egress:provide` alone rather than reuse the renderer bearer, which asks for no scope and so receives all of the grant's scopes.

## Server: `EgressBroker`

`open` fails closed with `ProviderGone` when no control socket is registered or when it drops mid-stream. Each `open` mints a stream id and a ticket: single-use, ten seconds, bound to (owner, stream id). The server's host, port, and profile are advisory.

## Desktop: `EgressProvider`

Every `open` goes through `openEgressTarget` (`EgressDialer`), so a blocked address is refused before any TCP. Limits: 64 streams per session, five minutes idle, 5 MiB/s token bucket (`EgressLimits`).

## Not yet wired

`makeEgressProvider` is not yet connected to a real control socket in `DesktopApp`. That binding (scoped token exchange, real resolver and connector, stream sockets) is the follow-up before TASK-39.
