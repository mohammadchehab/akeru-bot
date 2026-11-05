import type { BotEngineChoice } from "@isnadi/contracts";
import { BOT_ENGINE_MAX_FALLBACKS } from "@isnadi/contracts";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { useState } from "react";

import { useI18n } from "../../i18n";
import { SettingsRow } from "../settings/settingsLayout";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { buildBotModelChoices } from "./BotModelPicker";
import { fallbackLacksConsent, fallbackNeedsHistoryDisclosure } from "./botEngineFallbacks";
import type { BotProfileDraft } from "./useBotProfileDraft";

const choiceKey = (instanceId: string, model: string) => `${instanceId}\u0000${model}`;

/** The "If <model> can't answer" row and its ordered list of fallback models. */
export function BotEngineFallbackList({ draft }: { readonly draft: BotProfileDraft }) {
  const { t } = useI18n();

  // `index` is the entry that gets consent, or null while a new entry is being added.
  const [pending, setPending] = useState<{
    readonly entry: BotEngineChoice;
    readonly index: number | null;
  } | null>(null);

  const choices = buildBotModelChoices(draft.instanceEntries, draft.modelOptionsByInstance);

  const labelFor = (provider: string, model: string) =>
    choices.find((choice) => choice.instanceId === provider && choice.model === model)?.label ??
    model;

  const providerLabelFor = (provider: string) =>
    draft.instanceEntries.find((entry) => entry.instanceId === provider)?.displayName ?? provider;

  const taken = new Set([
    choiceKey(draft.providerInstanceId, draft.model),
    ...draft.fallbacks.map((entry) => choiceKey(entry.provider, entry.model)),
  ]);

  // Standard OpenCode runs on the legacy bridge, which cannot retry a turn, so the server refuses it.
  const isOpenCode = (instanceId: string) =>
    draft.instanceEntries.find((entry) => entry.instanceId === instanceId)?.driverKind ===
    "opencode";

  const addable = choices.filter(
    (choice) =>
      !choice.disabledReason &&
      !isOpenCode(choice.instanceId) &&
      !taken.has(choiceKey(choice.instanceId, choice.model)),
  );

  const primaryLabel = labelFor(draft.providerInstanceId, draft.model);

  const atLimit = draft.fallbacks.length >= BOT_ENGINE_MAX_FALLBACKS;

  const requestAdd = (entry: BotEngineChoice) => {
    if (
      fallbackNeedsHistoryDisclosure(
        { provider: draft.providerInstanceId, model: draft.model },
        entry,
      )
    ) {
      setPending({ entry, index: null });

      return;
    }

    draft.addFallback(entry);
  };

  return (
    <>
      <SettingsRow
        title={t("If {model} can’t answer", { model: primaryLabel })}
        description={t(
          "On a rate limit or usage limit, this bot retries the same turn on the next model, in order.",
        )}
        control={
          <Select
            value=""
            onValueChange={(value) => {
              const choice = addable.find(
                (item) => choiceKey(item.instanceId, item.model) === value,
              );

              if (choice) requestAdd({ provider: choice.instanceId, model: choice.model });
            }}
          >
            <SelectTrigger aria-label={t("Add model")} disabled={atLimit || addable.length === 0}>
              <SelectValue placeholder={t("Add model")} />
            </SelectTrigger>
            <SelectPopup>
              {addable.map((choice) => (
                <SelectItem
                  key={choiceKey(choice.instanceId, choice.model)}
                  value={choiceKey(choice.instanceId, choice.model)}
                >
                  {choice.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        }
      />

      {draft.fallbacks.length > 0 ? (
        <ol className="mx-4 mb-3 overflow-hidden rounded-xl border border-border/60 bg-card">
          {draft.fallbacks.map((entry, index) => (
            <li
              key={choiceKey(entry.provider, entry.model)}
              className="flex items-center gap-3 border-b border-border/50 px-4 py-2.5 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {index + 1}
                  {"  "}
                  {labelFor(entry.provider, entry.model)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {providerLabelFor(entry.provider)}
                </p>
              </div>
              {fallbackLacksConsent(
                { provider: draft.providerInstanceId, model: draft.model },
                entry,
              ) ? (
                <Button size="xs" variant="outline" onClick={() => setPending({ entry, index })}>
                  {t("Allow chat sharing")}
                </Button>
              ) : null}
              <Button
                size="xs"
                variant="ghost"
                aria-label={t("Move up")}
                disabled={index === 0}
                onClick={() => draft.moveFallback(index, -1)}
              >
                <ArrowUpIcon />
              </Button>
              <Button
                size="xs"
                variant="ghost"
                aria-label={t("Move down")}
                disabled={index === draft.fallbacks.length - 1}
                onClick={() => draft.moveFallback(index, 1)}
              >
                <ArrowDownIcon />
              </Button>
              <Button size="xs" variant="secondary" onClick={() => draft.removeFallback(index)}>
                {t("Remove")}
              </Button>
            </li>
          ))}
        </ol>
      ) : null}

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Share this chat with another provider?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "If the first model can’t answer, this bot’s chat history is sent to {provider} so it can continue the turn.",
                { provider: pending ? providerLabelFor(pending.entry.provider) : "" },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>{t("Cancel")}</AlertDialogClose>
            <AlertDialogClose
              render={
                <Button
                  onClick={() => {
                    if (pending?.index != null) draft.grantFallbackConsent(pending.index);
                    else if (pending) draft.addFallback({ ...pending.entry, historyConsent: true });
                    setPending(null);
                  }}
                />
              }
            >
              {t("Share chat")}
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}
