import * as Schema from "effect/Schema";

/** Why the desktop declined or failed to open a stream. Mirrors the desktop dialer's reasons. */
export const EgressRefusalReason = Schema.Literals([
  "port",
  "host-not-granted",
  "blocked-address",
  "resolve-failed",
  "connect-failed",
  "stream-limit",
]);

export type EgressRefusalReason = typeof EgressRefusalReason.Type;

/**
 * Server to desktop on the `/egress` control socket. `host`, `port` and `profileId` are
 * advisory: the desktop checks `profileId` against its own binding and applies its own port, grant,
 * and address checks before any TCP.
 */
export const EgressOpenFrame = Schema.Struct({
  type: Schema.Literal("open"),
  streamId: Schema.String,
  ticket: Schema.String,
  host: Schema.String,
  port: Schema.Int,
  profileId: Schema.String,
});

export type EgressOpenFrame = typeof EgressOpenFrame.Type;

export const EgressServerFrame = EgressOpenFrame;

export type EgressServerFrame = typeof EgressServerFrame.Type;

/** Desktop to server on the control socket. */
export const EgressRefusedFrame = Schema.Struct({
  type: Schema.Literal("refused"),
  streamId: Schema.String,
  reason: EgressRefusalReason,
});

export const EgressClosedFrame = Schema.Struct({
  type: Schema.Literal("closed"),
  streamId: Schema.String,
});

export const EgressDesktopFrame = Schema.Union([EgressRefusedFrame, EgressClosedFrame]);

export type EgressDesktopFrame = typeof EgressDesktopFrame.Type;
