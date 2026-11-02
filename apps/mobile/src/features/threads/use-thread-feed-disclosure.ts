import type { TurnId } from "@isnadi/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

import { copyTextWithHaptic } from "../../lib/copyTextWithHaptic";
import type { ThreadFeedLatestTurn } from "../../lib/threadActivity";

/**
 * The feed's disclosure and copy state: which work groups, work rows and turns are expanded, and
 * which work row just copied. An interrupted turn opens itself, and a finished turn folds again.
 */
export function useThreadFeedDisclosure(input: {
  readonly latestTurn: ThreadFeedLatestTurn | null;
  readonly suspendEndScrollMaintenanceForDisclosure: (reason: string) => void;
}) {
  const { latestTurn, suspendEndScrollMaintenanceForDisclosure } = input;
  const copyFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousLatestTurnRef = useRef(latestTurn);

  const [interactionState, setInteractionState] = useState<{
    readonly copiedRowId: string | null;
    readonly expandedWorkGroups: Record<string, boolean>;
    readonly expandedWorkRows: Record<string, boolean>;
    readonly expandedTurnIds: ReadonlySet<TurnId>;
  }>({
    copiedRowId: null,
    expandedWorkGroups: {},
    expandedWorkRows: {},
    expandedTurnIds: new Set(),
  });

  const { copiedRowId, expandedWorkGroups, expandedWorkRows, expandedTurnIds } = interactionState;

  useEffect(() => {
    const previous = previousLatestTurnRef.current;
    previousLatestTurnRef.current = latestTurn;

    if (!latestTurn || !previous) {
      return;
    }

    if (latestTurn.turnId === previous.turnId) {
      if (previous.state === "running" && latestTurn.state === "interrupted") {
        const interruptedTurnId = latestTurn.turnId;
        setInteractionState((current) => ({
          ...current,
          expandedTurnIds: new Set(current.expandedTurnIds).add(interruptedTurnId),
        }));
      }

      return;
    }

    setInteractionState((current) => {
      if (!current.expandedTurnIds.has(previous.turnId)) {
        return current;
      }

      const next = new Set(current.expandedTurnIds);
      next.delete(previous.turnId);

      return { ...current, expandedTurnIds: next };
    });
  }, [latestTurn]);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current) {
        clearTimeout(copyFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const onCopyWorkRow = useCallback((rowId: string, value: string) => {
    copyTextWithHaptic(value, {
      target: "thread-work-row",
      feedback: "selection",
    });
    setInteractionState((current) => ({ ...current, copiedRowId: rowId }));

    if (copyFeedbackTimeoutRef.current) {
      clearTimeout(copyFeedbackTimeoutRef.current);
    }

    copyFeedbackTimeoutRef.current = setTimeout(() => {
      setInteractionState((current) =>
        current.copiedRowId === rowId ? { ...current, copiedRowId: null } : current,
      );
      copyFeedbackTimeoutRef.current = null;
    }, 1200);
  }, []);

  const onToggleWorkGroup = useCallback(
    (groupId: string) => {
      suspendEndScrollMaintenanceForDisclosure(`work-toggle:${groupId}`);
      setInteractionState((current) => ({
        ...current,
        expandedWorkGroups: {
          ...current.expandedWorkGroups,
          [groupId]: !(current.expandedWorkGroups[groupId] ?? false),
        },
      }));
    },
    [suspendEndScrollMaintenanceForDisclosure],
  );

  const onToggleWorkRow = useCallback(
    (rowId: string) => {
      suspendEndScrollMaintenanceForDisclosure(rowId);
      setInteractionState((current) => ({
        ...current,
        expandedWorkRows: {
          ...current.expandedWorkRows,
          [rowId]: !(current.expandedWorkRows[rowId] ?? false),
        },
      }));
    },
    [suspendEndScrollMaintenanceForDisclosure],
  );

  const onToggleTurnFold = useCallback(
    (turnId: TurnId) => {
      suspendEndScrollMaintenanceForDisclosure(`turn-fold:${turnId}`);
      setInteractionState((current) => {
        const next = new Set(current.expandedTurnIds);

        if (next.has(turnId)) {
          next.delete(turnId);
        } else {
          next.add(turnId);
        }

        return { ...current, expandedTurnIds: next };
      });
    },
    [suspendEndScrollMaintenanceForDisclosure],
  );

  return {
    copiedRowId,
    expandedWorkGroups,
    expandedWorkRows,
    expandedTurnIds,
    onCopyWorkRow,
    onToggleWorkGroup,
    onToggleWorkRow,
    onToggleTurnFold,
  };
}
