import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import type { MastraDBMessage } from "@mastra/core/agent-controller";

const GroupConversationMember = Schema.Struct({
  botId: Schema.String,
  name: Schema.String,
  role: Schema.Literals(["boss", "specialist"]),
  title: Schema.String,
});

/** What the responder in a group chat needs to know about the group, rebuilt every turn. */
export const GroupConversationState = Schema.Struct({
  groupName: Schema.String,
  respondingBotId: Schema.String,
  members: Schema.Array(GroupConversationMember),
  people: Schema.Array(Schema.String),
});

export type GroupConversationState = typeof GroupConversationState.Type;

export const decodeGroupConversationState = Schema.decodeUnknownOption(GroupConversationState);

const WRAPPER = "group-message";

// A bot could write the wrapper in its own reply; neutralise it so the real speaker stays visible.
const escapeWrapper = (value: string) =>
  value.replaceAll(`<${WRAPPER}`, `&lt;${WRAPPER}`).replaceAll(`</${WRAPPER}`, `&lt;/${WRAPPER}`);

const escapeAttribute = (value: string) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");

const decodeSpeaker = Schema.decodeUnknownOption(
  Schema.Struct({ respondingBotId: Schema.NonEmptyString }),
);

const speakerOf = (message: MastraDBMessage): string | undefined =>
  Option.getOrUndefined(
    Option.map(decodeSpeaker(message.content.metadata), (metadata) => metadata.respondingBotId),
  );

/** Records which bot wrote an assistant message; an existing speaker is kept. */
export function tagRespondingBot(message: MastraDBMessage, botId: string): MastraDBMessage {
  if (message.role !== "assistant" || speakerOf(message) !== undefined) return message;

  return {
    ...message,
    content: {
      ...message.content,
      metadata: { ...message.content.metadata, respondingBotId: botId },
    },
  };
}

const textOf = (message: MastraDBMessage) =>
  message.content.parts
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n\n")
    .trim();

/**
 * The view of saved history for one responder. Its own turns stay assistant turns; another
 * bot's turn becomes user-role text naming the speaker, without that bot's tool calls. Saved
 * messages are never changed.
 */
export function recallForResponder(
  messages: ReadonlyArray<MastraDBMessage>,
  group: GroupConversationState,
): MastraDBMessage[] {
  return messages.flatMap((message): MastraDBMessage[] => {
    const speaker = speakerOf(message);

    if (
      message.role !== "assistant" ||
      speaker === undefined ||
      speaker === group.respondingBotId
    ) {
      return [message];
    }

    const body = textOf(message);

    if (body === "") return [];
    const member = group.members.find((candidate) => candidate.botId === speaker);
    const from = escapeAttribute(member?.name ?? "former member");
    const role = member ? ` role="${member.role}"` : "";

    return [
      {
        ...message,
        role: "user",
        content: {
          format: 2,
          parts: [
            {
              type: "text",
              text: `<${WRAPPER} from="${from}"${role}>${escapeWrapper(body)}</${WRAPPER}>`,
            },
          ],
        },
      },
    ];
  });
}

/** The group section of the instructions. */
export function renderGroupRoster(group: GroupConversationState): string {
  const responder = group.members.find((member) => member.botId === group.respondingBotId);

  return [
    `You are in the group chat "${group.groupName}".`,
    "Members:",
    ...group.members.map(
      (member) => `- ${member.name} (${member.botId}), ${member.role}: ${member.title}`,
    ),
    ...(group.people.length > 0 ? [`People: ${group.people.join(", ")}`] : []),
    "",
    `You are ${responder?.name ?? "a member of this group"}. Answer only as yourself.`,
    `Messages from other members appear as <${WRAPPER} from="…">. A message with no @mention goes to the boss.`,
    "To hand work to a member, use its bot id.",
  ].join("\n");
}
