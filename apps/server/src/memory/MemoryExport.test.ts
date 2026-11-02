import { assert, it } from "@effect/vitest";
import {
  IsnadiMemoryEntityId,
  IsnadiMemoryId,
  IsnadiMemoryPartitionId,
  IsnadiMemoryRootId,
  IsnadiMemoryTenantId,
  IsnadiMemoryUserId,
  BotId,
  ProjectId,
  ThreadId,
  type IsnadiMemoryRevision,
} from "@isnadi/contracts";
import * as Effect from "effect/Effect";

import { exportIsnadiMemory } from "./MemoryExport.ts";

const access = {
  tenantId: IsnadiMemoryTenantId.make("local"),
  userId: IsnadiMemoryUserId.make("owner"),
  threadId: ThreadId.make("thread-export"),
  projectId: ProjectId.make("project-export"),
  workspaceRoot: "/workspace/export",
  botId: BotId.make("bot-export"),
  groupId: null,
  respondingBotId: null,
  groupMemberBotIds: [],
} as const;

const revision = (number: number, deletionState: "active" | "tombstoned") =>
  ({
    id: IsnadiMemoryId.make(`revision-${number}`),
    rootId: IsnadiMemoryRootId.make("root-export"),
    revision: number,
    partition: {
      tenantId: access.tenantId,
      scope: "bot-user" as const,
      partitionId: IsnadiMemoryPartitionId.make("bot-export:owner"),
    },
    entityKind: "user" as const,
    entityId: IsnadiMemoryEntityId.make("owner"),
    kind: "fact" as const,
    value: {},
    fact: number === 1 ? "The user prefers vim." : "The user removed this preference.",
    sourceThreadId: access.threadId,
    sourceMessageId: null,
    authorBotId: access.botId,
    initiatingUserId: access.userId,
    createdAt: "2026-08-30T20:00:00.000Z",
    confirmedAt: "2026-08-30T20:00:00.000Z",
    updatedAt: `2026-08-30T20:0${number}:00.000Z`,
    confidence: 1,
    approvalState: "approved" as const,
    supersedesId: number === 1 ? null : IsnadiMemoryId.make("revision-1"),
    supersededById: number === 1 ? IsnadiMemoryId.make("revision-2") : null,
    visibility: "private" as const,
    deletionState,
    pinned: false,
    sensitive: false,
    affectedBotIds: [access.botId],
  }) satisfies IsnadiMemoryRevision;

it.effect("exports readable complete history with checksums and tombstones", () => {
  const current = revision(2, "tombstoned");
  const initial = revision(1, "active");

  const repository = {
    listByPartitions: () => Effect.succeed([initial, current]),
  };

  return Effect.gen(function* () {
    const archive = yield* exportIsnadiMemory({
      repository,
      access,
      target: "bot",
      complete: true,
      createdAt: "2026-08-30T21:00:00.000Z",
      conversations: [],
    });

    assert.equal(archive.schemaVersion, 2);
    assert.equal(archive.files.length, 2);

    if (archive.schemaVersion !== 2) return assert.fail("Expected a V2 archive.");
    assert.equal(archive.target, "bot");
    assert.equal(archive.revisions.length, 2);
    assert.match(archive.manifestSha256, /^[a-f0-9]{64}$/);
    assert.include(archive.files[0]?.content ?? "", "The user prefers vim.");
    assert.include(archive.files[1]?.content ?? "", '"deletionState":"tombstoned"');
    assert.isTrue(archive.files.every((file) => file.sha256.length === 64));
  });
});
