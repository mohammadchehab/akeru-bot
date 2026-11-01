import * as NodeCrypto from "node:crypto";
import { EventId } from "@isnadi/contracts";

export function nowIso(): string {
  return new Date().toISOString();
}

export function eventId(): EventId {
  return EventId.make(`mastra-${NodeCrypto.randomUUID()}`);
}
