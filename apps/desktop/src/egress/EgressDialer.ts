import * as NodeNet from "node:net";

import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { normalizeHost } from "@isnadi/shared/siteDomain";

import { classifyAddress } from "./EgressAddressPolicy.ts";

const ALLOWED_PORTS: ReadonlySet<number> = new Set([80, 443]);

export class EgressRefused extends Schema.TaggedErrorClass<EgressRefused>()("EgressRefused", {
  reason: Schema.Literals([
    "port",
    "host-not-granted",
    "blocked-address",
    "resolve-failed",
    "connect-failed",
  ]),
  host: Schema.String,
  port: Schema.Int,
}) {}

/** The owner's per-profile host grants. The server's opinion is never an input. */
export interface EgressHostPolicy {
  readonly allows: (profileId: string, host: string) => boolean;
}

export const denyAllHostPolicy: EgressHostPolicy = { allows: () => false };

export interface EgressDialerDeps<Socket> {
  /** Resolve a name to every address it has. Called at most once per open. */
  readonly resolve: (host: string) => Effect.Effect<ReadonlyArray<string>, Error>;
  /** Open TCP to a checked IP. Never receives a hostname. */
  readonly connect: (target: {
    readonly host: string;
    readonly port: number;
  }) => Effect.Effect<Socket, Error>;
  readonly hostPolicy: EgressHostPolicy;
  /** The PC's own subnets as CIDR strings, read fresh on every open. */
  readonly interfaces: () => ReadonlyArray<string>;
}

/**
 * Opens TCP for one CONNECT. The desktop's own checks decide: port 80/443, the owner's host
 * grants, and a single resolution whose every address must be public. The socket connects to the
 * checked IP so a second lookup can never swap in another address.
 */
export const openEgressTarget = <Socket>(
  request: { readonly host: string; readonly port: number; readonly profileId: string },
  deps: EgressDialerDeps<Socket>,
): Effect.Effect<Socket, EgressRefused> => {
  const refuse = (reason: EgressRefused["reason"]) =>
    Effect.logDebug("egress refused", { host: request.host, port: request.port, reason }).pipe(
      Effect.andThen(
        Effect.fail(new EgressRefused({ reason, host: request.host, port: request.port })),
      ),
    );

  return Effect.gen(function* () {
    if (!ALLOWED_PORTS.has(request.port)) return yield* refuse("port");

    const host = normalizeHost(request.host);

    if (host === null) return yield* refuse("resolve-failed");

    const interfaces = deps.interfaces();

    const connectTo = (ip: string) =>
      deps
        .connect({ host: ip, port: request.port })
        .pipe(Effect.catch(() => refuse("connect-failed")));

    if (!deps.hostPolicy.allows(request.profileId, host)) return yield* refuse("host-not-granted");

    if (NodeNet.isIP(host) !== 0) {
      if (classifyAddress(host, interfaces) !== "public") return yield* refuse("blocked-address");

      return yield* connectTo(host);
    }

    const addresses = yield* deps.resolve(host).pipe(Effect.catch(() => refuse("resolve-failed")));
    const [first] = addresses;

    if (first === undefined) return yield* refuse("resolve-failed");

    if (addresses.some((address) => classifyAddress(address, interfaces) !== "public")) {
      return yield* refuse("blocked-address");
    }

    return yield* connectTo(first);
  });
};
