import * as NodeNet from "node:net";

import * as Context from "effect/Context";
import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as PubSub from "effect/PubSub";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";

import { hasRegistrableDomain, normalizeHost } from "@isnadi/shared/siteDomain";

import * as DesktopEnvironment from "../app/DesktopEnvironment.ts";
import { denyAllHostPolicy, type EgressHostPolicy } from "./EgressDialer.ts";

const FILE_MODE = 0o600;

/**
 * One host the owner let a profile reach. `suffix` covers the domain and every subdomain of it.
 * The kind is chosen by the main-process entry path; no string from the server, a bot, or the
 * renderer is ever parsed into a suffix grant.
 */
export const EgressGrant = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("exact"), host: Schema.String }),
  Schema.Struct({ kind: Schema.Literal("suffix"), domain: Schema.String }),
]);

export type EgressGrant = typeof EgressGrant.Type;

const EgressGrantsDocument = Schema.Struct({
  version: Schema.Literal(1),
  /** Which profiles each desktop backend may act for. Keyed by the desktop's own instance id. */
  bindings: Schema.Record(Schema.String, Schema.Array(Schema.String)),
  grants: Schema.Record(Schema.String, Schema.Array(EgressGrant)),
});

type EgressGrantsDocument = typeof EgressGrantsDocument.Type;

const decodeDocument = Schema.decodeUnknownEffect(Schema.fromJsonString(EgressGrantsDocument));

const encodeDocument = Schema.encodeEffect(Schema.fromJsonString(EgressGrantsDocument));

const EMPTY_DOCUMENT: EgressGrantsDocument = { version: 1, bindings: {}, grants: {} };

export class EgressGrantInvalid extends Schema.TaggedErrorClass<EgressGrantInvalid>()(
  "EgressGrantInvalid",
  {
    reason: Schema.Literals(["host", "ip-suffix", "public-suffix"]),
    value: Schema.String,
  },
) {
  override get message(): string {
    return `The egress grant "${this.value}" is not allowed (${this.reason}).`;
  }
}

export class EgressGrantStoreUnreadable extends Schema.TaggedErrorClass<EgressGrantStoreUnreadable>()(
  "EgressGrantStoreUnreadable",
  { path: Schema.String },
) {
  override get message(): string {
    return `The egress grant file at ${this.path} is unreadable. Reset it to grant again.`;
  }
}

export class EgressGrantWriteError extends Schema.TaggedErrorClass<EgressGrantWriteError>()(
  "EgressGrantWriteError",
  {
    operation: Schema.Literals([
      "create-temporary-file-name",
      "encode-document",
      "create-directory",
      "write-temporary-file",
      "protect-temporary-file",
      "replace-grants-file",
    ]),
    path: Schema.String,
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return `Egress grant write failed during ${this.operation} at ${this.path}.`;
  }
}

export type EgressGrantChangeError =
  | EgressGrantInvalid
  | EgressGrantStoreUnreadable
  | EgressGrantWriteError;

/** `host` unset means the whole profile left the binding. */
export interface EgressRevocation {
  readonly profileId: string;
  readonly host?: string;
}

export type EgressGrantStatus = "ready" | "unreadable";

const normalizeDomain = (domain: string): string | null => {
  const host = normalizeHost(domain);

  return host === null || host === "" ? null : host;
};

/**
 * Validates and normalizes a grant the owner typed. A suffix must sit at least one label below a
 * public suffix (`example.com` yes; `com`, `co.uk`, `localhost` no) and may not be IP-shaped.
 */
const validateGrant = (grant: EgressGrant): Effect.Effect<EgressGrant, EgressGrantInvalid> => {
  if (grant.kind === "exact") {
    const host = normalizeDomain(grant.host);

    return host === null
      ? Effect.fail(new EgressGrantInvalid({ reason: "host", value: grant.host }))
      : Effect.succeed({ kind: "exact", host });
  }

  const domain = normalizeDomain(grant.domain);

  if (domain === null) {
    return Effect.fail(new EgressGrantInvalid({ reason: "host", value: grant.domain }));
  }

  // A numeric last label (`1.2.3`, `0x7f`) is how IPv4 forms hide; refuse them with real IPs.
  if (NodeNet.isIP(domain) !== 0 || /^(0x[0-9a-f]+|\d+)$/i.test(domain.split(".").at(-1) ?? "")) {
    return Effect.fail(new EgressGrantInvalid({ reason: "ip-suffix", value: grant.domain }));
  }

  if (!hasRegistrableDomain(domain)) {
    return Effect.fail(new EgressGrantInvalid({ reason: "public-suffix", value: grant.domain }));
  }

  return Effect.succeed({ kind: "suffix", domain });
};

const sameGrant = (left: EgressGrant, right: EgressGrant): boolean =>
  left.kind === "exact"
    ? right.kind === "exact" && left.host === right.host
    : right.kind === "suffix" && left.domain === right.domain;

/** Both sides are already normalized. A suffix grant never matches an IP host. */
const grantMatches = (grant: EgressGrant, host: string): boolean => {
  if (grant.kind === "exact") return grant.host === host;

  if (NodeNet.isIP(host) !== 0) return false;

  return host === grant.domain || host.endsWith(`.${grant.domain}`);
};

const grantLabel = (grant: EgressGrant): string =>
  grant.kind === "exact" ? grant.host : `*.${grant.domain}`;

export class DesktopEgressGrants extends Context.Service<
  DesktopEgressGrants,
  {
    /** `ready`, or `unreadable` when the file failed to decode: everything is denied. */
    readonly status: Effect.Effect<EgressGrantStatus>;
    /**
     * The policy for one desktop backend. A profile outside that backend's binding is refused
     * whatever grants it holds.
     */
    readonly policyFor: (instanceId: string) => EgressHostPolicy;
    readonly grant: (
      profileId: string,
      grant: EgressGrant,
    ) => Effect.Effect<void, EgressGrantChangeError>;
    readonly revoke: (
      profileId: string,
      grant: EgressGrant,
    ) => Effect.Effect<void, EgressGrantChangeError>;
    readonly setBinding: (
      instanceId: string,
      profileIds: ReadonlyArray<string>,
    ) => Effect.Effect<void, EgressGrantChangeError>;
    /** Replaces the file with an empty store. The only way out of `unreadable`. */
    readonly reset: Effect.Effect<void, EgressGrantWriteError>;
    readonly revocations: Stream.Stream<EgressRevocation>;
  }
>()("@isnadi/desktop/egress/EgressGrantStore/DesktopEgressGrants") {}

export const make = (grantsPath: string) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const crypto = yield* Crypto.Crypto;
    const writes = yield* Semaphore.make(1);
    const revocationBus = yield* PubSub.unbounded<EgressRevocation>();

    const raw = yield* fileSystem.readFileString(grantsPath).pipe(Effect.option);

    const loaded = yield* Option.match(raw, {
      onNone: () => Effect.succeed<EgressGrantsDocument | null>(EMPTY_DOCUMENT),
      onSome: (text) =>
        decodeDocument(text).pipe(
          Effect.catch(() =>
            Effect.logWarning("egress grants file is unreadable; denying every host", {
              path: grantsPath,
            }).pipe(Effect.as(null)),
          ),
        ),
    });

    // The synchronous snapshot the dialer reads. `null` means unreadable.
    let snapshot: EgressGrantsDocument | null = loaded;

    const writeFailure =
      (operation: EgressGrantWriteError["operation"], failedPath: string) => (cause: unknown) =>
        new EgressGrantWriteError({ operation, path: failedPath, cause });

    const persist = Effect.fn("desktop.egress.grants.persist")(function* (
      next: EgressGrantsDocument,
    ) {
      const suffix = yield* crypto.randomUUIDv4.pipe(
        Effect.map((uuid) => uuid.replace(/-/g, "")),
        Effect.mapError(writeFailure("create-temporary-file-name", grantsPath)),
      );

      const tempPath = `${grantsPath}.${process.pid}.${suffix}.tmp`;

      const encoded = yield* encodeDocument(next).pipe(
        Effect.mapError(writeFailure("encode-document", grantsPath)),
      );

      yield* fileSystem
        .makeDirectory(path.dirname(grantsPath), { recursive: true })
        .pipe(Effect.mapError(writeFailure("create-directory", path.dirname(grantsPath))));
      yield* Effect.gen(function* () {
        yield* fileSystem
          .writeFileString(tempPath, `${encoded}\n`)
          .pipe(Effect.mapError(writeFailure("write-temporary-file", tempPath)));
        yield* fileSystem
          .chmod(tempPath, FILE_MODE)
          .pipe(Effect.mapError(writeFailure("protect-temporary-file", tempPath)));
        yield* fileSystem
          .rename(tempPath, grantsPath)
          .pipe(Effect.mapError(writeFailure("replace-grants-file", grantsPath)));
      }).pipe(
        Effect.ensuring(
          fileSystem.remove(tempPath, { force: true }).pipe(Effect.catch(() => Effect.void)),
        ),
      );
      snapshot = next;
    });

    /** Applies `update` to the readable snapshot, persists it, then publishes what it revoked. */
    const change = (
      update: (
        document: EgressGrantsDocument,
      ) => Effect.Effect<
        { readonly next: EgressGrantsDocument; readonly revoked: ReadonlyArray<EgressRevocation> },
        EgressGrantInvalid
      >,
    ): Effect.Effect<void, EgressGrantChangeError> =>
      writes.withPermit(
        Effect.gen(function* () {
          const current = snapshot;

          if (current === null) return yield* new EgressGrantStoreUnreadable({ path: grantsPath });

          const { next, revoked } = yield* update(current);

          yield* persist(next);
          yield* Effect.forEach(
            revoked,
            (revocation) => PubSub.publish(revocationBus, revocation),
            {
              discard: true,
            },
          );
          yield* Effect.logInfo("egress grants changed", {
            revoked: revoked.map((revocation) => ({
              profileId: revocation.profileId,
              host: revocation.host,
            })),
          });
        }),
      );

    const allows = (instanceId: string, profileId: string, host: string): boolean => {
      const document = snapshot;

      if (document === null) return denyAllHostPolicy.allows(profileId, host);

      const normalized = normalizeHost(host);

      if (normalized === null) return false;

      if (!(document.bindings[instanceId] ?? []).includes(profileId)) return false;

      return (document.grants[profileId] ?? []).some((grant) => grantMatches(grant, normalized));
    };

    return DesktopEgressGrants.of({
      status: Effect.sync(() => (snapshot === null ? "unreadable" : "ready")),
      policyFor: (instanceId) => ({
        allows: (profileId, host) => allows(instanceId, profileId, host),
      }),
      grant: (profileId, grant) =>
        validateGrant(grant).pipe(
          Effect.flatMap((valid) =>
            change((document) => {
              const held = document.grants[profileId] ?? [];

              return Effect.succeed({
                next: held.some((entry) => sameGrant(entry, valid))
                  ? document
                  : { ...document, grants: { ...document.grants, [profileId]: [...held, valid] } },
                revoked: [],
              });
            }),
          ),
        ),
      revoke: (profileId, grant) =>
        validateGrant(grant).pipe(
          Effect.flatMap((valid) =>
            change((document) => {
              const held = document.grants[profileId] ?? [];
              const kept = held.filter((entry) => !sameGrant(entry, valid));

              if (kept.length === held.length)
                return Effect.succeed({ next: document, revoked: [] });

              return Effect.succeed({
                next: { ...document, grants: { ...document.grants, [profileId]: kept } },
                // Every stream the removed grant could have covered gets re-checked by the provider.
                revoked: [{ profileId, host: grantLabel(valid) }],
              });
            }),
          ),
        ),
      setBinding: (instanceId, profileIds) =>
        change((document) => {
          const next = [...new Set(profileIds)];

          const dropped = (document.bindings[instanceId] ?? []).filter(
            (profileId) => !next.includes(profileId),
          );

          return Effect.succeed({
            next: { ...document, bindings: { ...document.bindings, [instanceId]: next } },
            revoked: dropped.map((profileId) => ({ profileId })),
          });
        }),
      reset: writes.withPermit(
        Effect.gen(function* () {
          const before = snapshot;

          const profileIds = new Set(
            before === null
              ? []
              : [...Object.keys(before.grants), ...Object.values(before.bindings).flat()],
          );

          yield* persist(EMPTY_DOCUMENT);
          yield* Effect.forEach(
            profileIds,
            (profileId) => PubSub.publish(revocationBus, { profileId }),
            { discard: true },
          );
        }),
      ),
      revocations: Stream.fromPubSub(revocationBus),
    });
  });

export const layer = Layer.effect(
  DesktopEgressGrants,
  Effect.gen(function* () {
    const environment = yield* DesktopEnvironment.DesktopEnvironment;

    return yield* make(environment.egressGrantsPath);
  }),
);
