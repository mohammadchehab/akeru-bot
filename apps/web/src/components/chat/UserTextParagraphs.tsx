import type { ReactNode } from "react";

const identity = (paragraph: string) => paragraph;

/**
 * Renders a user's plain text one paragraph at a time, split on blank lines, so each paragraph
 * resolves its own direction: an Arabic paragraph followed by an English one reads correctly.
 * Single newlines stay inside their paragraph.
 */
export function UserTextParagraphs({
  text,
  renderParagraph = identity,
}: {
  readonly text: string;
  readonly renderParagraph?: (paragraph: string) => ReactNode;
}) {
  const paragraphs = text.split(/\n{2,}/);

  const render = (paragraph: string, index: number) => (
    <p key={index} dir="auto" className="whitespace-pre-wrap">
      {renderParagraph(paragraph)}
    </p>
  );

  if (paragraphs.length === 1) return render(text, 0);

  return <div className="space-y-4">{paragraphs.map(render)}</div>;
}
