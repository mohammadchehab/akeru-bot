import { createContext, useContext } from "react";

/** Whether the markdown text can be selected. Group chat messages turn it off so a long-press opens one sheet. */
export const MarkdownSelectableContext = createContext(true);

export function useMarkdownSelectable(): boolean {
  return useContext(MarkdownSelectableContext);
}
