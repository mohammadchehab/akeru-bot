import type { ThreadSilentRun } from "@isnadi/client-runtime/silent-run";
import { useMobileI18n } from "../../lib/i18n";
import type { EnvironmentConnectionPhase } from "@isnadi/client-runtime/connection";
import type { EnvironmentThreadStatus } from "@isnadi/client-runtime/state/threads";
import type { LegendListRef } from "@legendapp/list/react-native";
import { HeaderHeightContext } from "@react-navigation/elements";
import type {
  ApprovalRequestId,
  EnvironmentId,
  MessageId,
  ModelSelection,
  OrchestrationBot,
  OrchestrationThreadShell,
  RuntimeMode,
  ServerConfig as T3ServerConfig,
  ThreadId,
  ServerProviderUnavailability,
  UserInputQuestion,
} from "@isnadi/contracts";
import {
  defaultInstanceIdForDriver,
  PROVIDER_DISPLAY_NAMES,
  stockProviderAccountName,
  ProviderDriverKind,
} from "@isnadi/contracts";
import * as Haptics from "expo-haptics";
import {
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isLiquidGlassSupported, LiquidGlassView } from "@callstack/liquid-glass";
import {
  AppState,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
} from "react-native";
import {
  KeyboardController,
  KeyboardStickyView,
  useKeyboardState,
} from "react-native-keyboard-controller";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAtomValue } from "@effect/atom-react";
import { ControlPill } from "../../components/ControlPill";
import { useAppearancePreferences } from "../settings/appearance/AppearancePreferencesProvider";
import type { ComposerEditorHandle } from "../../components/ComposerEditor";
import type { StatusTone } from "../../components/StatusPill";
import { useThreadDraftForThread } from "../../state/use-thread-composer-state";
import { CHAT_CONTENT_MAX_WIDTH, type LayoutVariant } from "../../lib/layout";
import { IOS_NAV_BAR_HEIGHT } from "../../lib/layoutMetrics";
import { scopedThreadKey } from "../../lib/scopedEntities";
import { environmentGroupsAtom } from "../../state/bots";
import type {
  PendingApproval,
  PendingUserInput,
  PendingUserInputDraftAnswer,
  ThreadFeedEntry,
} from "../../lib/threadActivity";
import { PendingApprovalCard } from "./PendingApprovalCard";
import { ComputerDesktopNotice } from "./ComputerDesktopNotice";
import { setGroupReplyTarget, useGroupReplyTarget } from "../../state/group-reply-target";
import { useUserInputComposerSlot } from "./use-user-input-composer-slot";
import { PendingUserInputCard } from "./PendingUserInputCard";
import {
  COMPOSER_COLLAPSED_CHROME,
  COMPOSER_EXPANDED_CHROME,
  ThreadComposer,
  type ThreadComposerProps,
} from "./ThreadComposer";
import { ThreadFeed } from "./ThreadFeed";
import type { ThreadContentPresentation } from "./threadContentPresentation";
import { resolveThreadFeedSubmissionAnchor } from "./thread-feed-live-follow";
import { useStreamingHaptics } from "./use-streaming-haptics";
import { ResumeErrorSummary } from "./thread-detail-status";

export interface ThreadDetailScreenProps {
  readonly selectedThread: OrchestrationThreadShell;
  readonly contentPresentation: ThreadContentPresentation;
  readonly screenTone: StatusTone;
  readonly connectionError: string | null;
  readonly environmentLabel: string | null;
  readonly selectedThreadFeed: ReadonlyArray<ThreadFeedEntry>;
  /** Bots by id, so delegation cards can name the child bot. */
  readonly botsById?: ReadonlyMap<string, OrchestrationBot>;
  /**
   * The turn ended while delegated children still run; mobile renders the
   * same waiting line as web above the composer.
   */
  readonly waitingOnChildren?: boolean;
  readonly activeWorkStartedAt: string | null;
  readonly silentRun: ThreadSilentRun | null;
  readonly activePendingApproval: PendingApproval | null;
  readonly respondingApprovalId: ApprovalRequestId | null;
  readonly activePendingUserInput: PendingUserInput | null;
  readonly activePendingUserInputDrafts: Record<string, PendingUserInputDraftAnswer>;
  readonly activePendingUserInputAnswers: Record<string, string | ReadonlyArray<string>> | null;
  readonly respondingUserInputId: ApprovalRequestId | null;
  readonly connectionStateLabel: EnvironmentConnectionPhase;
  /** Message sync status for the selected thread (drives the composer status pill). */
  readonly threadSyncStatus?: EnvironmentThreadStatus;
  /** Non-null when older turns exist beyond the loaded window. */
  readonly loadEarlier?: { readonly loading: boolean; readonly onLoadEarlier: () => void } | null;
  readonly environmentId: EnvironmentId;
  readonly projectWorkspaceRoot: string | null;
  readonly threadCwd: string | null;
  readonly selectedThreadQueueCount: number;
  readonly serverConfig: T3ServerConfig | null;
  readonly layoutVariant?: LayoutVariant;
  readonly usesAutomaticContentInsets?: boolean;
  readonly onHeaderMaterialVisibilityChange?: (visible: boolean) => void;
  readonly onOpenConnectionEditor: () => void;
  readonly onChangeDraftMessage: (value: string) => void;
  readonly onPickDraftImages: () => Promise<void>;
  readonly onNativePasteImages: (uris: ReadonlyArray<string>) => Promise<void>;
  readonly onRemoveDraftImage: (imageId: string) => void;
  readonly onStopThread: () => void;
  readonly onResumeThread: () => void;
  readonly canResumeThread: boolean;
  /** Why the last request failed, when the server recorded a category. */
  readonly resumeFailureUnavailability?: ServerProviderUnavailability | null;
  readonly resumingThread: boolean;
  readonly onSendMessage: () => Promise<MessageId | null>;
  readonly onReconnectEnvironment: () => void;
  readonly onUpdateThreadModelSelection: (modelSelection: ModelSelection) => void;
  readonly onUpdateThreadRuntimeMode: (runtimeMode: RuntimeMode) => void;
  readonly onRespondToApproval: ReturnType<
    typeof import("../../state/use-selected-thread-requests").useSelectedThreadRequests
  >["onRespondToApproval"];
  readonly onSelectUserInputOption: (
    requestId: ApprovalRequestId,
    question: UserInputQuestion,
    label: string,
  ) => void;
  readonly onChangeUserInputCustomAnswer: (
    requestId: ApprovalRequestId,
    questionId: string,
    customAnswer: string,
  ) => void;
  readonly onSubmitUserInput: ReturnType<
    typeof import("../../state/use-selected-thread-requests").useSelectedThreadRequests
  >["onSubmitUserInput"];
  readonly showContent?: boolean;
}

/** Submitted messages land at the tail, so search newest-first. */
function feedHasMessageNearEnd(
  feed: ReadonlyArray<ThreadFeedEntry>,
  messageId: MessageId,
): boolean {
  for (let index = feed.length - 1; index >= 0; index -= 1) {
    const entry = feed[index];

    if (entry?.type === "message" && entry.id === messageId) {
      return true;
    }
  }

  return false;
}

/**
 * Reads the chat's draft next to the composer so a keystroke re-renders the
 * composer only, not the thread screen and its feed.
 */
const ThreadDraftComposer = memo(function ThreadDraftComposer(
  props: Omit<ThreadComposerProps, "draftMessage" | "draftAttachments"> & {
    readonly threadId: ThreadId;
  },
) {
  const { threadId, ...composerProps } = props;

  const { draftMessage, draftAttachments } = useThreadDraftForThread({
    environmentId: props.environmentId,
    threadId,
  });

  return (
    <ThreadComposer
      {...composerProps}
      draftMessage={draftMessage}
      draftAttachments={draftAttachments}
    />
  );
});

export const ThreadDetailScreen = memo(function ThreadDetailScreen(props: ThreadDetailScreenProps) {
  const { t } = useMobileI18n();
  const insets = useSafeAreaInsets();
  const groups = useAtomValue(environmentGroupsAtom(props.environmentId));
  const groupId = props.selectedThread.groupId ?? null;

  const groupBossBotId =
    groupId === null ? null : (groups.find((group) => group.id === groupId)?.bossBotId ?? null);

  const speakerGroup = useMemo(
    () => (groupId === null ? null : { bossBotId: groupBossBotId }),
    [groupBossBotId, groupId],
  );

  const isKeyboardVisible = useKeyboardState((state) => state.isVisible);
  const liveKeyboardHeight = useKeyboardState((state) => state.height);
  // Android can swallow the IME hide callbacks when the app is backgrounded
  // mid keyboard-hide (the reported repro: send — which blurs and starts the
  // hide — then Home within a second). The keyboard library's height AND
  // visibility then stay frozen open, so gating the sticky translation on
  // visibility alone still strands the composer after resume. Quarantine the
  // translation on every Android resume instead; any sign of a live keyboard
  // stream — an owned input gaining focus, or any visibility/height movement —
  // lifts it. A healthy resume sees no visual difference (the translation is
  // already zero while the keyboard is closed).
  const [keyboardStateSuspect, setKeyboardStateSuspect] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setKeyboardStateSuspect(true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    setKeyboardStateSuspect(false);
  }, [isKeyboardVisible, liveKeyboardHeight]);

  const handleOwnedInputFocusChange = useCallback((focused: boolean) => {
    if (focused) {
      setKeyboardStateSuspect(false);
    }
  }, []);

  const windowHeight = useWindowDimensions().height;
  const navigationHeaderHeight = useContext(HeaderHeightContext) || insets.top + IOS_NAV_BAR_HEIGHT;
  const agentLabel = `${props.selectedThread.modelSelection.instanceId} bot`;
  const selectedThreadKey = scopedThreadKey(props.environmentId, props.selectedThread.id);
  const composerEditorRef = useRef<ComposerEditorHandle>(null);
  const composerOverlayRef = useRef<View>(null);
  const listRef = useRef<LegendListRef>(null);
  const feedTouchStartRef = useRef<{ pageX: number; pageY: number } | null>(null);
  const selectedThreadKeyRef = useRef(selectedThreadKey);
  const lastScrolledSubmittedMessageIdRef = useRef<MessageId | null>(null);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [anchorMessageId, setAnchorMessageId] = useState<MessageId | null>(null);
  const [submittedMessageId, setSubmittedMessageId] = useState<MessageId | null>(null);
  const [endFollowEnabled, setEndFollowEnabled] = useState(true);

  // Android keys the safe-area padding on keyboard visibility (#5988): the
  // back gesture closes the keyboard while the editor stays focused, and a
  // focus-keyed inset would leave the toolbar under the gesture bar. iOS must
  // NOT use visibility — it only flips on keyboardDidHide, after the hide
  // animation, so the composer would ride down flush to the screen edge and
  // then snap up into the inset. On iOS blur precedes the hide, so the
  // focus-keyed inset is already in place while the composer rides down.
  const composerBottomInset = (Platform.OS === "android" ? isKeyboardVisible : composerExpanded)
    ? 0
    : Math.max(insets.bottom, 12);

  const contentPresentationKind = props.contentPresentation.kind;

  // The raw sync status enters "synchronizing" on every full fetch, cached or
  // not. Whether messages are already on screen decides the pill label: no
  // data yet → "Loading messages", cached data reconciling → "Syncing".
  const threadSyncPhase = (() => {
    switch (props.threadSyncStatus) {
      case "empty":
      case "cached":
      case "synchronizing":
        if (contentPresentationKind === "ready") {
          return "syncing" as const;
        }

        return contentPresentationKind === "loading" ? ("loading" as const) : null;
      default:
        return null;
    }
  })();

  const selectedThreadFeed = props.selectedThreadFeed;
  const composerChrome = composerExpanded ? COMPOSER_EXPANDED_CHROME : COMPOSER_COLLAPSED_CHROME;
  const composerOverlapHeight = composerChrome + composerBottomInset;

  const {
    activeUserInputRequestId,
    userInputCollapsed,
    pendingUserInputMaxHeight,
    estimatedOverlayHeight,
    onComposerLayout,
    userInputCardProgress,
    userInputCardCoverage,
    combinedContentInsetEndAdjustment,
    freeze,
    scrollMessageToEnd,
    handleToggleUserInputCollapsed,
  } = useUserInputComposerSlot({
    activePendingUserInputRequestId: props.activePendingUserInput?.requestId ?? null,
    liveKeyboardHeight,
    windowHeight,
    navigationHeaderHeight,
    composerBottomInset,
    composerOverlapHeight,
    listRef,
    composerOverlayRef,
    usesAutomaticContentInsets: props.usesAutomaticContentInsets,
    bottomSafeAreaInset: insets.bottom,
    endFollowEnabled,
  });

  const showContent = props.showContent ?? true;
  const layoutVariant = props.layoutVariant ?? "compact";
  const isSplitLayout = layoutVariant === "split";
  const contentMaxWidth = isSplitLayout ? CHAT_CONTENT_MAX_WIDTH : undefined;
  const selectedInstanceId = props.selectedThread.modelSelection.instanceId;
  useStreamingHaptics(props.selectedThread.id, props.selectedThreadFeed);

  // The reply chip's message can leave the read model (deleted, or a different history window).
  const replyThreadKey = scopedThreadKey(props.environmentId, props.selectedThread.id);
  const replyTargetMessageId = useGroupReplyTarget(replyThreadKey)?.messageId ?? null;

  useEffect(() => {
    if (replyTargetMessageId === null) return;

    const present = props.selectedThreadFeed.some(
      (entry) => entry.type === "message" && entry.message.id === replyTargetMessageId,
    );

    if (!present) setGroupReplyTarget(replyThreadKey, null);
  }, [props.selectedThreadFeed, replyTargetMessageId, replyThreadKey]);

  const selectedProvider = props.serverConfig?.providers.find(
    (provider) => provider.instanceId === selectedInstanceId,
  );

  const selectedDriver = selectedProvider?.driver ?? ProviderDriverKind.make(selectedInstanceId);

  // Failure copy names a built-in instance by its account: "ChatGPT", not "Codex".
  const selectedProviderName =
    (selectedInstanceId === defaultInstanceIdForDriver(selectedDriver)
      ? stockProviderAccountName(selectedDriver, selectedProvider?.displayName)
      : undefined) ??
    selectedProvider?.displayName ??
    PROVIDER_DISPLAY_NAMES[selectedDriver] ??
    selectedInstanceId;

  const selectedProviderSkills = useMemo(
    () =>
      props.serverConfig?.providers.find((provider) => provider.instanceId === selectedInstanceId)
        ?.skills ?? [],
    [props.serverConfig, selectedInstanceId],
  );

  useLayoutEffect(() => {
    selectedThreadKeyRef.current = selectedThreadKey;
  }, [selectedThreadKey]);

  useEffect(() => {
    setAnchorMessageId(null);
    setSubmittedMessageId(null);
    lastScrolledSubmittedMessageIdRef.current = null;
    setEndFollowEnabled(true);
    freeze.set(false);
  }, [freeze, selectedThreadKey]);

  useEffect(() => {
    if (
      submittedMessageId === null ||
      lastScrolledSubmittedMessageIdRef.current === submittedMessageId ||
      contentPresentationKind !== "ready" ||
      !feedHasMessageNearEnd(selectedThreadFeed, submittedMessageId)
    ) {
      return;
    }

    const targetThreadKey = selectedThreadKey;

    const frame = requestAnimationFrame(() => {
      if (selectedThreadKeyRef.current !== targetThreadKey) {
        return;
      }

      lastScrolledSubmittedMessageIdRef.current = submittedMessageId;
      // Wait for the keyboard dismissal (started by blur() on send) to finish
      // before scrolling: scrollMessageToEnd freezes keyboard-driven inset
      // updates while it runs, and a close event swallowed by that freeze
      // leaves the keyboard padding permanently applied — overshooting the
      // anchor and leaving a phantom bottom inset once the reply streams in.
      void KeyboardController.dismiss()
        .then(() => {
          if (
            selectedThreadKeyRef.current !== targetThreadKey ||
            lastScrolledSubmittedMessageIdRef.current !== submittedMessageId
          ) {
            return;
          }

          return scrollMessageToEnd({ animated: true, closeKeyboard: false });
        })
        .catch(() => {
          if (
            selectedThreadKeyRef.current !== targetThreadKey ||
            lastScrolledSubmittedMessageIdRef.current !== submittedMessageId
          ) {
            return;
          }

          lastScrolledSubmittedMessageIdRef.current = null;
          freeze.set(false);
        });
    });

    return () => cancelAnimationFrame(frame);
  }, [
    submittedMessageId,
    freeze,
    contentPresentationKind,
    selectedThreadFeed,
    scrollMessageToEnd,
    selectedThreadKey,
  ]);

  // Read through a ref so streaming feed updates do not change the send
  // callback and re-render the memoized composer on every delta.
  const selectedThreadFeedRef = useRef(selectedThreadFeed);
  useLayoutEffect(() => {
    selectedThreadFeedRef.current = selectedThreadFeed;
  }, [selectedThreadFeed]);

  const handleSendMessage = useCallback(async () => {
    const targetThreadKey = selectedThreadKey;

    const hasUserMessage = selectedThreadFeedRef.current.some(
      (entry) => entry.type === "message" && entry.message.role === "user",
    );

    const messageId = await props.onSendMessage();

    if (messageId === null || selectedThreadKeyRef.current !== targetThreadKey) {
      return messageId;
    }

    setSubmittedMessageId(messageId);
    setAnchorMessageId(
      resolveThreadFeedSubmissionAnchor({
        currentAnchorMessageId: anchorMessageId,
        submittedMessageId: messageId,
        hasStartedTurn: props.selectedThread.latestTurn !== null,
        hasUserMessage,
        queuedMessageCount: props.selectedThreadQueueCount,
      }),
    );
    composerEditorRef.current?.blur();

    return messageId;
  }, [
    anchorMessageId,
    props.onSendMessage,
    props.selectedThread.latestTurn,
    props.selectedThreadQueueCount,
    selectedThreadKey,
  ]);

  const collapseComposer = useCallback(() => {
    composerEditorRef.current?.blur();
  }, []);

  const handleScrollToEnd = useCallback(() => {
    void Haptics.selectionAsync();
    void scrollMessageToEnd({ animated: true, closeKeyboard: false }).catch(() => {
      freeze.set(false);
    });
  }, [freeze, scrollMessageToEnd]);

  const showScrollToEndButton = contentPresentationKind === "ready" && !endFollowEnabled;
  const { themeAppearance } = useAppearancePreferences();
  const isDarkMode = themeAppearance === "dark";

  const handleFeedTouchStart = useCallback((event: GestureResponderEvent) => {
    feedTouchStartRef.current = {
      pageX: event.nativeEvent.pageX,
      pageY: event.nativeEvent.pageY,
    };
  }, []);

  const handleFeedTouchMove = useCallback((event: GestureResponderEvent) => {
    const start = feedTouchStartRef.current;

    if (!start) {
      return;
    }

    const deltaX = event.nativeEvent.pageX - start.pageX;
    const deltaY = event.nativeEvent.pageY - start.pageY;

    if (Math.hypot(deltaX, deltaY) > 8) {
      feedTouchStartRef.current = null;
    }
  }, []);

  const handleFeedTouchEnd = useCallback(() => {
    if (feedTouchStartRef.current) {
      collapseComposer();
    }

    feedTouchStartRef.current = null;
  }, [collapseComposer]);

  const handleFeedTouchCancel = useCallback(() => {
    feedTouchStartRef.current = null;
  }, []);

  return (
    <View className="flex-1">
      {showContent ? (
        <View
          className="flex-1"
          onTouchStart={handleFeedTouchStart}
          onTouchMove={handleFeedTouchMove}
          onTouchEnd={handleFeedTouchEnd}
          onTouchCancel={handleFeedTouchCancel}
        >
          <ThreadFeed
            key={props.selectedThread.id}
            environmentId={props.environmentId}
            threadId={props.selectedThread.id}
            botId={props.selectedThread.botId ?? null}
            workspaceRoot={props.threadCwd}
            feed={props.selectedThreadFeed}
            botsById={props.botsById}
            speakerGroup={speakerGroup}
            contentPresentation={props.contentPresentation}
            agentLabel={agentLabel}
            latestTurn={props.selectedThread.latestTurn}
            activeWorkStartedAt={props.activeWorkStartedAt}
            silentRun={props.silentRun}
            listRef={listRef}
            freeze={freeze}
            anchorMessageId={anchorMessageId}
            submittedMessageId={submittedMessageId}
            contentInsetEndAdjustment={combinedContentInsetEndAdjustment}
            contentTopInset={0}
            contentBottomInset={estimatedOverlayHeight}
            contentMaxWidth={contentMaxWidth}
            layoutVariant={layoutVariant}
            usesAutomaticContentInsets={props.usesAutomaticContentInsets}
            onHeaderMaterialVisibilityChange={props.onHeaderMaterialVisibilityChange}
            onEndFollowEnabledChange={setEndFollowEnabled}
            skills={selectedProviderSkills}
            loadEarlier={props.loadEarlier ?? null}
          />
        </View>
      ) : (
        <View className="flex-1" />
      )}

      {/* Floating composer — sticks to keyboard via KeyboardStickyView */}
      {showContent ? (
        <KeyboardStickyView
          // The animated keyboard height can remain stale after a dismissed
          // IME on both platforms. Visibility is the authoritative closed
          // state, so disable the translation rather than stranding the pill.
          enabled={isKeyboardVisible && !keyboardStateSuspect}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
          offset={{ closed: 0, opened: 0 }}
        >
          {/* No paddingTop here: the overlay's measured height becomes the
              list's bottom inset, so any padding above the pill/composer
              pushes the resting content floor up by the same amount. */}
          <View ref={composerOverlayRef} onLayout={onComposerLayout} className="w-full">
            {showScrollToEndButton ? (
              <Animated.View
                pointerEvents="box-none"
                className="absolute -top-11 left-0 right-0 z-20 items-center"
                entering={FadeInDown.duration(160)}
                exiting={FadeOut.duration(100)}
              >
                {isLiquidGlassSupported ? (
                  <LiquidGlassView
                    colorScheme={isDarkMode ? "dark" : "light"}
                    effect="regular"
                    interactive
                    // Interactive glass can render larger than the requested
                    // box (minimum touch size), so center the pill instead of
                    // relying on it filling the glass exactly.
                    style={{
                      alignItems: "center",
                      borderRadius: 18,
                      height: 36,
                      justifyContent: "center",
                      overflow: "hidden",
                      width: 36,
                    }}
                  >
                    <ControlPill
                      accessibilityLabel={t("Scroll to end")}
                      activateOnPressIn
                      className="h-9 w-9 bg-transparent"
                      icon={{ ios: "chevron.down", android: "keyboard_arrow_down" }}
                      onPress={handleScrollToEnd}
                    />
                  </LiquidGlassView>
                ) : (
                  <ControlPill
                    accessibilityLabel={t("Scroll to end")}
                    activateOnPressIn
                    className="h-9 w-9 border border-border bg-card shadow-md shadow-black/10"
                    icon={{ ios: "chevron.down", android: "keyboard_arrow_down" }}
                    onPress={handleScrollToEnd}
                  />
                )}
              </Animated.View>
            ) : null}
            <View className="w-full self-center" style={{ maxWidth: contentMaxWidth }}>
              {props.waitingOnChildren === true && props.activeWorkStartedAt === null ? (
                <View className="mx-4 mb-2 self-start rounded-full border border-border bg-card px-3 py-1">
                  <Text accessibilityLiveRegion="polite" className="text-xs text-foreground-muted">
                    {t("Waiting on delegated work")}
                  </Text>
                </View>
              ) : null}
              {props.canResumeThread ? (
                <View className="mx-4 mb-3 flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                  <ResumeErrorSummary
                    error={props.selectedThread.session?.lastError ?? null}
                    context={{
                      unavailability: props.resumeFailureUnavailability ?? null,
                      providerName: selectedProviderName,
                      modelName: props.selectedThread.modelSelection.model,
                    }}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Resume interrupted request"
                    className="rounded-xl bg-primary px-3 py-2 disabled:opacity-50"
                    disabled={props.resumingThread}
                    onPress={props.onResumeThread}
                  >
                    <Text className="font-semibold text-primary-foreground">
                      {props.resumingThread ? "Resuming…" : "Resume"}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
              {props.activePendingApproval || props.activePendingUserInput ? (
                <Animated.View
                  className="shrink-0 gap-3 px-4 pb-3"
                  // The questionnaire replaces the composer, so it must pad
                  // the home indicator the composer normally covers.
                  style={
                    activeUserInputRequestId !== null
                      ? { paddingBottom: composerBottomInset }
                      : undefined
                  }
                  entering={FadeInDown.duration(220)}
                  exiting={FadeOut.duration(140)}
                >
                  {props.activePendingApproval ? (
                    <PendingApprovalCard
                      approval={props.activePendingApproval}
                      respondingApprovalId={props.respondingApprovalId}
                      onRespond={props.onRespondToApproval}
                    />
                  ) : null}
                  {props.activePendingUserInput ? (
                    <PendingUserInputCard
                      pendingUserInput={props.activePendingUserInput}
                      maxHeight={pendingUserInputMaxHeight}
                      collapsed={userInputCollapsed}
                      onToggleCollapsed={handleToggleUserInputCollapsed}
                      onStopThread={props.onStopThread}
                      cardProgress={userInputCardProgress}
                      cardCoverage={userInputCardCoverage}
                      onInputFocusChange={handleOwnedInputFocusChange}
                      drafts={props.activePendingUserInputDrafts}
                      answers={props.activePendingUserInputAnswers}
                      respondingUserInputId={props.respondingUserInputId}
                      onSelectOption={props.onSelectUserInputOption}
                      onChangeCustomAnswer={props.onChangeUserInputCustomAnswer}
                      onSubmit={props.onSubmitUserInput}
                    />
                  ) : null}
                </Animated.View>
              ) : null}
            </View>

            <ComputerDesktopNotice
              environmentId={props.environmentId}
              threadId={props.selectedThread.id}
              botId={props.selectedThread.botId ?? null}
              turnActivity={`${props.selectedThread.latestTurn?.turnId ?? ""}:${props.selectedThread.latestTurn?.state ?? ""}`}
            />

            {/* Hidden (not unmounted) while a user-input request owns the
                composer slot, so composer drafts and editor state survive. */}
            <View style={activeUserInputRequestId !== null ? { display: "none" } : undefined}>
              <ThreadDraftComposer
                threadId={props.selectedThread.id}
                editorRef={composerEditorRef}
                placeholder={t("Message, or run a command…")}
                contentMaxWidth={contentMaxWidth}
                connectionState={props.connectionStateLabel}
                connectionError={props.connectionError}
                environmentLabel={props.environmentLabel}
                threadSyncPhase={threadSyncPhase}
                selectedThread={props.selectedThread}
                serverConfig={props.serverConfig}
                queueCount={props.selectedThreadQueueCount}
                environmentId={props.environmentId}
                projectCwd={props.projectWorkspaceRoot}
                bottomInset={composerBottomInset}
                onChangeDraftMessage={props.onChangeDraftMessage}
                onPickDraftImages={props.onPickDraftImages}
                onNativePasteImages={props.onNativePasteImages}
                onRemoveDraftImage={props.onRemoveDraftImage}
                onStopThread={props.onStopThread}
                onSendMessage={handleSendMessage}
                onReconnectEnvironment={props.onReconnectEnvironment}
                onUpdateModelSelection={props.onUpdateThreadModelSelection}
                onUpdateRuntimeMode={props.onUpdateThreadRuntimeMode}
                onExpandedChange={setComposerExpanded}
                onEditorFocusChange={handleOwnedInputFocusChange}
              />
            </View>
          </View>
        </KeyboardStickyView>
      ) : null}
    </View>
  );
});
