import type { GroupHopBudget } from "@isnadi/contracts";
import { stepHopBudget } from "@isnadi/shared/groupHopBudget";
import { useState } from "react";
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
  readonly onChange: (hopBudget: GroupHopBudget) => Promise<boolean>;
}) {
  const { t } = useI18n();
  // The server value lags a press, so fast presses step from what was just chosen, not from props.
  const [chosen, setChosen] = useState<{ base: number; value: number } | null>(null);
  const hopBudget = chosen?.base === props.hopBudget ? chosen.value : props.hopBudget;
  const less = stepHopBudget(hopBudget, -1);
  const more = stepHopBudget(hopBudget, 1);

  const change = (next: GroupHopBudget) => {
    setChosen({ base: props.hopBudget, value: next });
    void props.onChange(next).then((ok) => {
      if (!ok) setChosen(null);
    });
  };

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
              onClick={() => less !== null && change(less)}
            >
              <MinusIcon aria-hidden />
            </Button>
            <span aria-live="polite" data-testid="group-hop-budget-value">
              {hopBudget}
            </span>
            <Button
              size="icon-sm"
              variant="outline"
              aria-label={t("More replies")}
              disabled={more === null}
              onClick={() => more !== null && change(more)}
            >
              <PlusIcon aria-hidden />
            </Button>
          </div>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
