import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { SkillId } from "./routines.ts";

/** One skill in a bot's set, switched on or off without leaving the set. */
export const BotSkill = Schema.Struct({
  skillId: SkillId,
  enabled: Schema.Boolean,
});

export type BotSkill = typeof BotSkill.Type;

/** A bot's skills; bots stored before skills existed decode with none. */
export const BotSkills = Schema.Array(BotSkill).pipe(
  Schema.withDecodingDefault(Effect.succeed([])),
);

/** The "Use other skills from the registry" switch; off for bots stored before it existed. */
export const BotSkillRegistryAccess = Schema.Boolean.pipe(
  Schema.withDecodingDefault(Effect.succeed(false)),
);
