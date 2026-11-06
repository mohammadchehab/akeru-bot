import * as Haptics from "expo-haptics";
import { ActionSheetIOS, Alert, Platform } from "react-native";

import { copyTextWithHaptic } from "../../lib/copyTextWithHaptic";
import { runGroupMessageAction, type GroupReplyTarget } from "./groupReply";

/**
 * The one native sheet a long-press on a group bot message opens: Reply (when the message can be
 * replied to), Copy and Cancel. Android has no action sheet, so the same choices show as an alert.
 */
export function presentGroupMessageActions(input: {
  readonly target: GroupReplyTarget | null;
  readonly text: string;
  readonly title: string;
  readonly labels: { readonly reply: string; readonly copy: string; readonly cancel: string };
  readonly onReply: (target: GroupReplyTarget) => void;
}): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  const run = (action: "reply" | "copy") =>
    runGroupMessageAction(action, {
      target: input.target,
      text: input.text,
      onReply: input.onReply,
      copy: (text) => copyTextWithHaptic(text, { target: "group message" }),
    });

  const choices: Array<{ readonly action: "reply" | "copy"; readonly label: string }> = [
    ...(input.target ? [{ action: "reply" as const, label: input.labels.reply }] : []),
    { action: "copy", label: input.labels.copy },
  ];

  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...choices.map((choice) => choice.label), input.labels.cancel],
        cancelButtonIndex: choices.length,
      },
      (index) => {
        const choice = choices[index];

        if (choice) run(choice.action);
      },
    );

    return;
  }

  Alert.alert(input.title, undefined, [
    ...choices.map((choice) => ({ text: choice.label, onPress: () => run(choice.action) })),
    { text: input.labels.cancel, style: "cancel" as const },
  ]);
}
