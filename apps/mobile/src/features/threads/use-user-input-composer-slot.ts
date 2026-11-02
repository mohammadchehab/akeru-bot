import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Keyboard, Platform, type View } from "react-native";
import type { LegendListRef } from "@legendapp/list/react-native";
import { Easing, useAnimatedReaction, useSharedValue, withTiming } from "react-native-reanimated";
import type { ApprovalRequestId } from "@isnadi/contracts";

import { useKeyboardChatComposerInset, useKeyboardScrollToEnd } from "@legendapp/list/keyboard";

import {
  derivePendingUserInputMaxHeight,
  ESTIMATED_KEYBOARD_HEIGHT,
  USER_INPUT_TOGGLE_DURATION_MS,
} from "./pendingUserInputLayout";

const USER_INPUT_TOGGLE_TIMING = {
  duration: USER_INPUT_TOGGLE_DURATION_MS,
  easing: Easing.out(Easing.cubic),
};

/**
 * The pending user-input card's collapse state and the composer slot's inset choreography:
 * the card's reserved height, the end inset the feed follows, and the end re-pin after a toggle.
 */
export function useUserInputComposerSlot(input: {
  readonly activePendingUserInputRequestId: ApprovalRequestId | null;
  readonly liveKeyboardHeight: number;
  readonly windowHeight: number;
  readonly navigationHeaderHeight: number;
  readonly composerBottomInset: number;
  readonly composerOverlapHeight: number;
  readonly listRef: RefObject<LegendListRef | null>;
  readonly composerOverlayRef: RefObject<View | null>;
  readonly usesAutomaticContentInsets: boolean | undefined;
  readonly bottomSafeAreaInset: number;
  readonly endFollowEnabled: boolean;
}) {
  const {
    activePendingUserInputRequestId,
    liveKeyboardHeight,
    windowHeight,
    navigationHeaderHeight,
    composerBottomInset,
    composerOverlapHeight,
    listRef,
    composerOverlayRef,
    usesAutomaticContentInsets,
    bottomSafeAreaInset,
    endFollowEnabled,
  } = input;

  // While a user-input request is pending, the questionnaire owns the
  // composer slot outright: expanded it is the full card, collapsed it is a
  // composer-style bar in the same place (with its own stop control). The
  // composer never mounts into the transition, which keeps the collapse and
  // keyboard animations coherent. Collapse state is keyed by request id so a
  // new request re-expands automatically.
  const [collapsedUserInputRequestId, setCollapsedUserInputRequestId] =
    useState<ApprovalRequestId | null>(null);

  const activeUserInputRequestId = activePendingUserInputRequestId;

  const userInputCollapsed =
    activeUserInputRequestId !== null && collapsedUserInputRequestId === activeUserInputRequestId;

  // The card's height RESERVES keyboard space at all times instead of
  // tracking the keyboard: transforms (the sticky translation) apply
  // same-frame on the UI thread while layout props lag a Yoga pass behind,
  // so any height that follows the keyboard flashes the card over the nav
  // header on the way up. With a constant height the keyboard transition is
  // pure translation — frame-perfect by construction — and the resting card
  // stays compact over the transcript. Before the first open the reserve is
  // an estimate; once a real height is known the card corrects once,
  // discretely.
  const [lastKnownKeyboardHeight, setLastKnownKeyboardHeight] = useState(0);
  useEffect(() => {
    if (liveKeyboardHeight > 0 && liveKeyboardHeight !== lastKnownKeyboardHeight) {
      setLastKnownKeyboardHeight(liveKeyboardHeight);
    }
  }, [lastKnownKeyboardHeight, liveKeyboardHeight]);

  const pendingUserInputMaxHeight = derivePendingUserInputMaxHeight({
    windowHeight,
    keyboardHeight:
      lastKnownKeyboardHeight > 0 ? lastKnownKeyboardHeight : ESTIMATED_KEYBOARD_HEIGHT,
    navigationHeaderHeight,
    // The questionnaire owns the composer slot, so only the composer's
    // bottom inset still overlaps.
    composerOverlapHeight: composerBottomInset,
  });

  const estimatedOverlayHeight = composerOverlapHeight;

  // The overlay's measured height includes the home-indicator inset (the
  // composer pads it), but contentInsetAdjustmentBehavior="automatic" makes
  // UIKit add the safe-area bottom to the content inset AGAIN — leaving a
  // dead strip between the resting content and the composer. Report the
  // overlay height minus the safe area; UIKit adds it back, and ThreadFeed
  // hands LegendList the same delta via contentInsetEndStaticAdjustment so
  // its end-scroll math matches the real resting position.
  const nativeInsetOvercount =
    usesAutomaticContentInsets === true && Platform.OS === "ios" ? bottomSafeAreaInset : 0;

  const { contentInsetEndAdjustment, onComposerLayout } = useKeyboardChatComposerInset(
    listRef,
    composerOverlayRef,
    Math.max(0, estimatedOverlayHeight - nativeInsetOvercount),
    -nativeInsetOvercount,
  );

  // The expanded questionnaire is an absolute overlay on iOS, so it never
  // changes the measured overlay height (that constancy is what keeps the
  // feed from snapping on collapse/expand). The toggle choreography runs on
  // SHARED VALUES set directly in the tap handler — one JS hop, then the
  // card's rise/sink and the feed's end-inset glide animate in lockstep on
  // the UI thread, keyboard-style, instead of waiting on React mount +
  // onLayout + state round trips. Coverage (how far the card extends above
  // the bar) is measured straight into a shared value by the card's
  // onLayout, with no re-render.
  const userInputCardProgress = useSharedValue(1);
  const userInputInsetProgress = useSharedValue(1);
  const userInputCardCoverage = useSharedValue(0);
  // Android renders the expanded card in-flow (it cannot hit-test the iOS
  // overlay outside the bar's bounds), so its measured overlay height already
  // includes the card — the coverage extra is iOS-only.
  const userInputCoverageApplies = Platform.OS === "ios" && activeUserInputRequestId !== null;

  const combinedContentInsetEndAdjustment = useSharedValue(
    Math.max(0, estimatedOverlayHeight - nativeInsetOvercount),
  );

  useAnimatedReaction(
    () =>
      contentInsetEndAdjustment.value +
      (userInputCoverageApplies ? userInputInsetProgress.value * userInputCardCoverage.value : 0),
    (value) => {
      combinedContentInsetEndAdjustment.value = value;
    },
    [userInputCoverageApplies],
  );
  const { freeze, scrollMessageToEnd } = useKeyboardScrollToEnd({ listRef });
  const endFollowEnabledRef = useRef(true);
  endFollowEnabledRef.current = endFollowEnabled;
  const userInputRepinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The list's own corrections for these inset changes drift on short
  // content (and the error compounds across toggles), so deterministically
  // re-pin the end once a toggle settles: a no-op when the resting position
  // is already right, corrective when it is not. Follow state is re-checked
  // inside the callback — the user may grab the list during the settle
  // window, and yanking them back would override a live gesture.
  const scheduleUserInputRepin = useCallback(
    (delayMs: number) => {
      if (userInputRepinTimerRef.current !== null) {
        clearTimeout(userInputRepinTimerRef.current);
      }

      userInputRepinTimerRef.current = setTimeout(() => {
        userInputRepinTimerRef.current = null;

        if (!endFollowEnabledRef.current) {
          return;
        }

        void scrollMessageToEnd({ animated: false, closeKeyboard: false }).catch(() => {
          freeze.set(false);
        });
      }, delayMs);
    },
    [freeze, scrollMessageToEnd],
  );

  useEffect(
    () => () => {
      if (userInputRepinTimerRef.current !== null) {
        clearTimeout(userInputRepinTimerRef.current);
      }
    },
    [],
  );

  const handleToggleUserInputCollapsed = useCallback(() => {
    if (activeUserInputRequestId === null) {
      return;
    }

    if (userInputCollapsed) {
      // Expanding: card and feed glide start NOW, on the UI thread.
      userInputCardProgress.value = withTiming(1, USER_INPUT_TOGGLE_TIMING);
      userInputInsetProgress.value = withTiming(1, USER_INPUT_TOGGLE_TIMING);
      setCollapsedUserInputRequestId(null);
      scheduleUserInputRepin(USER_INPUT_TOGGLE_DURATION_MS + 50);
    } else {
      // Collapsing hides the custom-answer inputs; release the keyboard with
      // them instead of leaving it up over a dead responder.
      Keyboard.dismiss();
      userInputCardProgress.value = withTiming(0, USER_INPUT_TOGGLE_TIMING);
      // Instant: the sinking card still covers the strip being revealed, and
      // animating the inset downward is what drifted the short-content end
      // anchor.
      userInputInsetProgress.value = 0;
      setCollapsedUserInputRequestId(activeUserInputRequestId);
      scheduleUserInputRepin(60);
    }
  }, [
    activeUserInputRequestId,
    scheduleUserInputRepin,
    userInputCardProgress,
    userInputCollapsed,
    userInputInsetProgress,
  ]);

  useEffect(() => {
    // A new request always arrives expanded.
    userInputCardProgress.value = 1;
    userInputInsetProgress.value = 1;
  }, [activeUserInputRequestId, userInputCardProgress, userInputInsetProgress]);

  return {
    activeUserInputRequestId,
    userInputCollapsed,
    pendingUserInputMaxHeight,
    estimatedOverlayHeight,
    contentInsetEndAdjustment,
    onComposerLayout,
    userInputCardProgress,
    userInputCardCoverage,
    combinedContentInsetEndAdjustment,
    freeze,
    scrollMessageToEnd,
    handleToggleUserInputCollapsed,
  };
}
