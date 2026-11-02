import { SquareIcon } from "lucide-react";

import { useI18n } from "../../i18n";
import { Button } from "../ui/button";

/**
 * Who answers next in a group, with the Stop that ends the running turn and clears the queue.
 * Shown while a turn runs or someone is waiting; the line itself only names who is waiting.
 */
export function GroupResponderQueue(props: {
  readonly names: readonly string[];
  readonly onStop: () => void;
}) {
  const { t } = useI18n();
  const names = props.names.join(", ");

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm text-muted-foreground">
      {props.names.length > 0 ? (
        <span aria-live="polite" data-testid="responder-queue">
          {props.names.length === 1
            ? t("{names} is next", { names })
            : t("{names} are next", { names })}
        </span>
      ) : (
        <span />
      )}
      <Button size="xs" variant="ghost-muted" onClick={props.onStop}>
        <SquareIcon aria-hidden />
        {t("Stop")}
      </Button>
    </div>
  );
}
