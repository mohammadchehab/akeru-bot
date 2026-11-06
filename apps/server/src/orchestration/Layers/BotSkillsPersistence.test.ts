import { BotId, CommandId, SkillId } from "@isnadi/contracts";
import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as SqlClient from "effect/unstable/sql/SqlClient";
import { OrchestrationEngineService } from "../Services/OrchestrationEngine.ts";
import { OrchestrationProjectionPipeline } from "../Services/ProjectionPipeline.ts";
import { ProjectionSnapshotQuery } from "../Services/ProjectionSnapshotQuery.ts";
import { TestLayer } from "./test-support/BotPersistenceHarness.ts";

const botId = BotId.make("bot-skills");

const createdAt = "2026-01-01T00:00:00.000Z";

it.layer(TestLayer)("bot skills persistence", (it) => {
  it.effect("keeps a bot's skills and registry access through updates and a rebuild", () =>
    Effect.gen(function* () {
      const engine = yield* OrchestrationEngineService;
      const projectionPipeline = yield* OrchestrationProjectionPipeline;
      const snapshots = yield* ProjectionSnapshotQuery;
      const sql = yield* SqlClient.SqlClient;

      const readBot = Effect.gen(function* () {
        const bot = (yield* snapshots.getShellSnapshot()).bots.find((entry) => entry.id === botId);
        assert.isDefined(bot);

        return bot;
      });

      yield* engine.dispatch({
        type: "bot.create",
        commandId: CommandId.make("cmd-skills-create"),
        botId,
        name: "Scout",
        title: "Research lead",
        avatar: { kind: "blob", shape: "hex", color: "#7357ff" },
        engine: null,
        sandbox: "local",
        groupId: null,
        createdAt,
      });
      const created = yield* readBot;
      assert.deepStrictEqual(created.skills, []);
      assert.strictEqual(created.skillRegistryAccess, false);

      yield* engine.dispatch({
        type: "bot.update",
        commandId: CommandId.make("cmd-skills-update"),
        botId,
        skills: [
          { skillId: SkillId.make("pdf"), enabled: true },
          { skillId: SkillId.make("xlsx"), enabled: false },
        ],
        skillRegistryAccess: true,
      });
      const updated = yield* readBot;
      assert.deepStrictEqual(
        updated.skills.map(({ skillId, enabled }) => [String(skillId), enabled]),
        [
          ["pdf", true],
          ["xlsx", false],
        ],
      );
      assert.strictEqual(updated.skillRegistryAccess, true);

      yield* engine.dispatch({
        type: "bot.update",
        commandId: CommandId.make("cmd-skills-rename"),
        botId,
        title: "Research chief",
      });
      const renamed = yield* readBot;
      assert.strictEqual(renamed.title, "Research chief");
      assert.strictEqual(renamed.skills.length, 2);
      assert.strictEqual(renamed.skillRegistryAccess, true);

      yield* sql`DELETE FROM projection_bots`;
      yield* sql`DELETE FROM projection_state WHERE projector = 'projection.bots'`;
      yield* projectionPipeline.bootstrap;
      const rebuilt = yield* readBot;
      assert.deepStrictEqual(rebuilt.skills, updated.skills);
      assert.strictEqual(rebuilt.skillRegistryAccess, true);
    }),
  );
});
