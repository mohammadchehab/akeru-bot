import { createContext, useContext } from "react";

/** Whether the markdown text can be selected. Group chat messages turn it off so a long-press opens one sheet. */
export const MarkdownSelectableContext = createContext(true);

export function useMarkdownSelectable(): boolean {
  return useContext(MarkdownSelectableContext);
}

/**
 * A long-press handler for links. Group chat messages set it so a long-press on a link opens the
 * message's sheet instead of the link; a tap still opens the link. Null leaves links as they are.
 */
export const MarkdownLongPressContext = createContext<(() => void) | null>(null);

export function useMarkdownLongPress(): (() => void) | null {
  return useContext(MarkdownLongPressContext);
}
