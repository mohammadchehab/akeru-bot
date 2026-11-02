/**
 * Symbols whose picture points the way the reader moves (back, forward, a disclosure arrow), so a
 * right-to-left layout mirrors them. iOS mirrors its own SF Symbols; the Android icons are drawn
 * from a fixed set and need the flip applied.
 */
const MIRRORED_IN_RTL: ReadonlySet<string> = new Set([
  "chevron.left",
  "chevron.right",
  "arrow.right.circle",
  "arrow.turn.left.up",
  "arrow.uturn.backward",
]);

export const mirroredInRtl = (symbol: string | undefined, isRTL: boolean): boolean =>
  isRTL && symbol !== undefined && MIRRORED_IN_RTL.has(symbol);
