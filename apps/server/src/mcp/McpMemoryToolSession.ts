import type { ThreadId } from "@isnadi/contracts";

import type { IsnadiMemoryToolHandler } from "../memory/BotMemoryToolHandlers.ts";

const handlersByThread = new Map<string, IsnadiMemoryToolHandler>();

export function setMcpMemoryToolSession(
  threadId: ThreadId,
  handler: IsnadiMemoryToolHandler,
): void {
  handlersByThread.set(String(threadId), handler);
}

export function readMcpMemoryToolSession(threadId: ThreadId): IsnadiMemoryToolHandler | undefined {
  return handlersByThread.get(String(threadId));
}

export function clearMcpMemoryToolSession(threadId: ThreadId): void {
  handlersByThread.delete(String(threadId));
}

export function clearAllMcpMemoryToolSessions(): void {
  handlersByThread.clear();
}
