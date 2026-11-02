import * as Schema from "effect/Schema";

import { TrimmedNonEmptyString } from "./baseSchemas.ts";
import { ProviderInstanceId } from "./providerInstance.ts";

/** Cursor signs in through its own CLI on the environment host; these carry that flow to a client. */
export const CursorLoginInput = Schema.Struct({
  instanceId: ProviderInstanceId,
});

export type CursorLoginInput = typeof CursorLoginInput.Type;

export const CursorLoginStarted = Schema.Struct({
  /**
   * The link the CLI printed for the user to open. `null` when it printed none (for example, the
   * account is already signed in); the client then points the user at `agent login` on the host.
   */
  loginUrl: Schema.NullOr(TrimmedNonEmptyString),
});

export type CursorLoginStarted = typeof CursorLoginStarted.Type;

export class CursorLoginError extends Schema.TaggedErrorClass<CursorLoginError>()(
  "CursorLoginError",
  {
    operation: Schema.Literals(["login", "logout"]),
    reason: TrimmedNonEmptyString,
  },
) {
  override get message(): string {
    return `Cursor ${this.operation} failed: ${this.reason}`;
  }
}
