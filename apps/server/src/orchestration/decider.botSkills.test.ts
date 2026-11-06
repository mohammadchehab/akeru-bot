import { BotId, CommandId, SkillId, type OrchestrationCommand } from "@isnadi/contracts";
import { assert, it } from "@effect/vitest";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";

import { decideOrchestrationCommand } from "./decider.ts";
import { createEmptyReadModel } from "./projector.ts";

type BotUpdateCommand = Extract<OrchestrationCommand, { type: "bot.update" }>;

const NOW = "2026-08-27T12:00:00.000Z";

const BOT_ID = BotId.make("bot-skills");

const create = {
  type: "bot.create" as const,
  commandId: CommandId.make("cmd-create"),
  botId: BOT_ID,
  name: "Scout",
  title: "Research lead",
  avatar: { kind: "dither" as const, seed: BOT_ID },
  engine: null,
  sandbox: "local" as const,
  groupId: null,
  createdAt: NOW,
};

const decideEvents = (command: Parameters<typeof decideOrchestrationCommand>[0]["command"]) =>
  decideOrchestrationCommand({ command, readModel: createEmptyReadModel(NOW) }).pipe(
    Effect.map((decided) => (Array.isArray(decided) ? decided : [decided])),
  );

it.layer(NodeServices.layer)("bot skills decisions", (it) => {
  it.effect("creates a bot with no skills and no registry access by default", () =>
    Effect.gen(function* () {
      const [event] = yield* decideEvents(create);

      assert.strictEqual(event?.type, "bot.created");

      if (event?.type !== "bot.created") return;
      assert.deepStrictEqual(event.payload.skills, []);
      assert.strictEqual(event.payload.skillRegistryAccess, false);
    }),
  );

  it.effect("creates a bot with the skills it was hired with", () =>
    Effect.gen(function* () {
      const [event] = yield* decideEvents({
        ...create,
        skills: [{ skillId: SkillId.make("pdf"), enabled: true }],
        skillRegistryAccess: true,
      });

      if (event?.type !== "bot.created") return assert.fail("expected bot.created");
      assert.strictEqual(event.payload.skills.length, 1);
      assert.strictEqual(event.payload.skillRegistryAccess, true);
    }),
  );

  it.effect("carries skills on bot.update and leaves them out when not sent", () =>
    Effect.gen(function* () {
      const readModel = {
        ...createEmptyReadModel(NOW),
        bots: [
          {
            id: BOT_ID,
            name: "Scout",
            title: "Research lead",
            label: null,
            description: null,
            disabledMcpServerIds: [],
            skills: [],
            skillRegistryAccess: false,
            avatar: create.avatar,
            engine: null,
            sandbox: "local" as const,
            runtimeMode: "full-access" as const,
            imageProvider: null,
            voiceEnabled: true,
            channelBindings: [],
            groupId: null,
            archivedAt: null,
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
      };

      const update = (extra: Partial<BotUpdateCommand>) =>
        decideOrchestrationCommand({
          command: {
            type: "bot.update",
            commandId: CommandId.make("cmd-update"),
            botId: BOT_ID,
            ...extra,
          },
          readModel,
        });

      const withSkills = yield* update({
        skills: [{ skillId: SkillId.make("pdf"), enabled: false }],
      });

      const withoutSkills = yield* update({ title: "Chief" });

      const payloadOf = (decided: typeof withSkills) => {
        const event = Array.isArray(decided) ? decided[0] : decided;

        return event?.type === "bot.updated" ? event.payload : null;
      };

      assert.strictEqual(payloadOf(withSkills)?.skills?.[0]?.enabled, false);
      assert.isFalse(payloadOf(withoutSkills) !== null && "skills" in payloadOf(withoutSkills)!);
    }),
  );
});
