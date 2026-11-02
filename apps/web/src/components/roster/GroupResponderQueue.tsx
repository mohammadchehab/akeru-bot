import { SquareIcon } from "lucide-react";

import { useI18n } from "../../i18n";
import { Button } from "../ui/button";

/**
 * Who answers next in a group, with the Stop that ends the running turn and clears the queue.
 * Shows only while someone is waiting; the activity status above it already names who is answering.
 */
export function GroupResponderQueue(props: {
  readonly names: readonly string[];
  readonly onStop: () => void;
}) {
  const { t } = useI18n();

  if (props.names.length === 0) return null;
  const names = props.names.join(", ");

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm text-muted-foreground">
      <span aria-live="polite">
        {props.names.length === 1
          ? t("{names} is next", { names })
          : t("{names} are next", { names })}
      </span>
      <Button size="xs" variant="ghost-muted" onClick={props.onStop}>
        <SquareIcon aria-hidden />
        {t("Stop replies")}
      </Button>
    </div>
  );
}
