import * as NodeSocket from "@effect/platform-node/NodeSocket";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Queue from "effect/Queue";
import * as Schema from "effect/Schema";

export class EgressLinkError extends Schema.TaggedErrorClass<EgressLinkError>()("EgressLinkError", {
  cause: Schema.Defect(),
}) {
  override get message(): string {
    return "The egress websocket failed.";
  }
}

/** One open websocket, as the provider uses it: sends, an ordered receive loop, and close. */
export interface EgressSocketLink {
  readonly send: (data: string | Uint8Array) => Effect.Effect<void>;
  /** Delivers messages in order and ends when the socket closes. */
  readonly run: (
    onMessage: (data: Uint8Array, isText: boolean) => Effect.Effect<void>,
  ) => Effect.Effect<void>;
  readonly close: Effect.Effect<void>;
}

const toBytes = (data: Buffer | ArrayBuffer | Array<Buffer>): Uint8Array => {
  if (Array.isArray(data)) return Buffer.concat(data);

  return data instanceof ArrayBuffer ? new Uint8Array(data) : data;
};

/** Resolves once the socket is open. Messages that arrive before `run` starts are kept. */
export const openEgressSocket = (
  url: string,
  headers: Readonly<Record<string, string>>,
): Effect.Effect<EgressSocketLink, EgressLinkError> =>
  Effect.gen(function* () {
    const inbound = yield* Queue.unbounded<{ data: Uint8Array; isText: boolean }, Cause.Done>();

    const socket = yield* Effect.callback<NodeSocket.NodeWS.WebSocket, EgressLinkError>(
      (resume) => {
        const ws = new NodeSocket.NodeWS.WebSocket(url, { headers });

        ws.on("message", (data, isBinary) => {
          Queue.offerUnsafe(inbound, { data: toBytes(data), isText: !isBinary });
        });
        ws.on("close", () => {
          Queue.endUnsafe(inbound);
        });
        ws.once("open", () => resume(Effect.succeed(ws)));
        ws.once("error", (cause) => {
          Queue.endUnsafe(inbound);
          resume(Effect.fail(new EgressLinkError({ cause })));
        });

        return Effect.sync(() => ws.terminate());
      },
    );

    // After open, an error is followed by close, which already ends the queue.
    socket.on("error", () => undefined);

    return {
      send: (data) =>
        Effect.callback<void>((resume) => {
          socket.send(data, (error) => {
            if (error) socket.terminate();
            resume(Effect.void);
          });
        }),
      run: (onMessage) =>
        Effect.forever(
          Queue.take(inbound).pipe(
            Effect.flatMap((message) => onMessage(message.data, message.isText)),
          ),
        ).pipe(Effect.catchIf(Cause.isDone, () => Effect.void)),
      close: Effect.sync(() => socket.close()),
    };
  });
