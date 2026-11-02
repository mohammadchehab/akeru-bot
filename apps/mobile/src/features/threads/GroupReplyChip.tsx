import { Pressable, View } from "react-native";

import { AppText as Text } from "../../components/AppText";
import { SymbolView } from "../../components/AppSymbol";
import { useMobileI18n } from "../../lib/i18n";
import { useThemeColor } from "../../lib/useThemeColor";
import type { GroupReplyTarget } from "./groupReply";

/**
 * The quote above the composer for a group reply: the bot's name, one line of its message, and a
 * clear button. A draft that names someone beats the reply, so the chip then reads "Quoting".
 */
export function GroupReplyChip(props: {
  readonly target: GroupReplyTarget;
  readonly quoting: boolean;
  readonly onClear: () => void;
}) {
  const { t } = useMobileI18n();
  const mutedColor = useThemeColor("--color-icon-subtle");

  return (
    <View
      accessibilityRole="summary"
      className="mb-2 flex-row items-center gap-2 rounded-xl bg-card px-3 py-2"
    >
      <Text className="shrink-0 text-xs text-foreground-muted">
        {props.quoting ? t("Quoting") : t("Replying to")}
      </Text>
      <Text className="shrink-0 text-xs font-t3-medium text-foreground" numberOfLines={1}>
        {props.target.botName}
      </Text>
      <Text className="min-w-0 flex-1 text-xs text-foreground-muted" numberOfLines={1}>
        {props.target.snippet}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Cancel reply")}
        hitSlop={8}
        onPress={props.onClear}
      >
        <SymbolView name="xmark" size={14} tintColor={mutedColor} type="monochrome" />
      </Pressable>
    </View>
  );
}
