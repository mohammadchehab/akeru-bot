import type { GroupHopBudget } from "@isnadi/contracts";
import { stepHopBudget } from "@isnadi/shared/groupHopBudget";
import { MinusIcon, PlusIcon, RepeatIcon } from "lucide-react";

import { useI18n } from "../../i18n";
import { Button } from "../ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "../ui/popover";

/**
 * The group chat's reply budget: how many bot-to-bot replies one message may chain before the
 * group stops. A change applies from the next message you send.
 */
export function GroupHopBudgetControl(props: {
  readonly hopBudget: number;
  readonly onChange: (hopBudget: GroupHopBudget) => void;
}) {
  const { t } = useI18n();
  const less = stepHopBudget(props.hopBudget, -1);
  const more = stepHopBudget(props.hopBudget, 1);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            size="icon-sm"
            variant="ghost-muted"
            aria-label={t("Reply budget")}
            data-testid="group-hop-budget-trigger"
          />
        }
      >
        <RepeatIcon aria-hidden />
      </PopoverTrigger>
      <PopoverPopup align="end">
        <div className="flex flex-col gap-2 text-sm" data-testid="group-hop-budget">
          <span className="font-medium">{t("Reply budget")}</span>
          <span className="text-muted-foreground">
            {t(
              "Bot replies one message can chain before the group stops. Applies from your next message.",
            )}
          </span>
          <div className="flex items-center justify-between gap-2">
            <Button
              size="icon-sm"
              variant="outline"
              aria-label={t("Fewer replies")}
              disabled={less === null}
              onClick={() => less !== null && props.onChange(less)}
            >
              <MinusIcon aria-hidden />
            </Button>
            <span aria-live="polite" data-testid="group-hop-budget-value">
              {props.hopBudget}
            </span>
            <Button
              size="icon-sm"
              variant="outline"
              aria-label={t("More replies")}
              disabled={more === null}
              onClick={() => more !== null && props.onChange(more)}
            >
              <PlusIcon aria-hidden />
            </Button>
          </div>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
