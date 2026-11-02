import * as Haptics from "expo-haptics";
import { ActionSheetIOS, Alert, Platform } from "react-native";

import type { GroupReplyTarget } from "./groupReply";

/**
 * The native sheet a long-press on a bot message opens: Reply or Cancel. Android has no action
 * sheet, so the same two choices show as an alert.
 */
export function presentGroupReplyActions(input: {
  readonly target: GroupReplyTarget;
  readonly replyLabel: string;
  readonly cancelLabel: string;
  readonly onReply: (target: GroupReplyTarget) => void;
}): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: [input.replyLabel, input.cancelLabel], cancelButtonIndex: 1 },
      (index) => {
        if (index === 0) input.onReply(input.target);
      },
    );

    return;
  }

  Alert.alert(input.target.botName, undefined, [
    { text: input.replyLabel, onPress: () => input.onReply(input.target) },
    { text: input.cancelLabel, style: "cancel" },
  ]);
}
