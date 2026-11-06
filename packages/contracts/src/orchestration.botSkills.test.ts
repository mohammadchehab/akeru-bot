import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import {
  decodeClientOrchestrationCommand,
  decodeOrchestrationBot,
} from "./orchestration.test-support.ts";

const storedBot = {
  id: "bot-1",
  name: "Isnadi",
  title: "Agent",
  avatar: { kind: "dither", seed: "isnadi" },
  engine: null,
  sandbox: "local",
  groupId: null,
  archivedAt: null,
  createdAt: "2026-08-27T20:00:00.000Z",
  updatedAt: "2026-08-27T20:00:00.000Z",
};

it.effect("decodes a bot stored before skills as having none and no registry access", () =>
  Effect.gen(function* () {
    const bot = yield* decodeOrchestrationBot(storedBot);

    assert.deepStrictEqual(bot.skills, []);
    assert.strictEqual(bot.skillRegistryAccess, false);
  }),
);

it.effect("keeps a bot's skills in order with their on/off state", () =>
  Effect.gen(function* () {
    const bot = yield* decodeOrchestrationBot({
      ...storedBot,
      skills: [
        { skillId: "pdf", enabled: true },
        { skillId: "xlsx", enabled: false },
      ],
      skillRegistryAccess: true,
    });

    assert.deepStrictEqual(
      bot.skills.map(({ skillId, enabled }) => ({ skillId: String(skillId), enabled })),
      [
        { skillId: "pdf", enabled: true },
        { skillId: "xlsx", enabled: false },
      ],
    );
    assert.strictEqual(bot.skillRegistryAccess, true);
  }),
);

it.effect("rejects a bot skill without an id", () =>
  Effect.gen(function* () {
    const error = yield* decodeOrchestrationBot({
      ...storedBot,
      skills: [{ skillId: "  ", enabled: true }],
    }).pipe(Effect.flip);

    assert.isDefined(error);
  }),
);

it.effect("carries skills and registry access on bot.update", () =>
  Effect.gen(function* () {
    const command = yield* decodeClientOrchestrationCommand({
      type: "bot.update",
      commandId: "command-1",
      botId: "bot-1",
      skills: [{ skillId: "pdf", enabled: false }],
      skillRegistryAccess: true,
    });

    assert.deepStrictEqual(
      command.type === "bot.update"
        ? command.skills?.map(({ skillId, enabled }) => ({ skillId: String(skillId), enabled }))
        : null,
      [{ skillId: "pdf", enabled: false }],
    );
    assert.strictEqual(command.type === "bot.update" ? command.skillRegistryAccess : null, true);
  }),
);
