/**
 * Argv for one headless Cursor turn. Cursor's print mode cannot ask for approval, so Isnadi's
 * runtime modes collapse to two access levels: only an explicit `full-access` may act without
 * asking (`--force`); every other mode, and a missing one, is read-only (`--mode ask`).
 *
 * @module provider/Layers/cursor/CursorTurnArgs
 */
import type { RuntimeMode } from "@isnadi/contracts";

export type CursorAccess = "read-only" | "full";

export function cursorAccessFor(runtimeMode: RuntimeMode | undefined): CursorAccess {
  return runtimeMode === "full-access" ? "full" : "read-only";
}

export interface CursorTurnArgsInput {
  readonly cwd: string;
  readonly runtimeMode?: RuntimeMode | undefined;
  /** Omit for the provider default. Parameterised ids (`id[effort=high]`) pass through unchanged. */
  readonly model?: string | undefined;
  readonly resumeSessionId?: string | undefined;
}

export function buildCursorTurnArgs(input: CursorTurnArgsInput): ReadonlyArray<string> {
  return [
    "-p",
    "--output-format",
    "stream-json",
    "--stream-partial-output",
    "--trust",
    "--workspace",
    input.cwd,
    ...(input.model ? ["--model", input.model] : []),
    ...(input.resumeSessionId ? ["--resume", input.resumeSessionId] : []),
    ...(cursorAccessFor(input.runtimeMode) === "full" ? ["--force"] : ["--mode", "ask"]),
  ];
}
