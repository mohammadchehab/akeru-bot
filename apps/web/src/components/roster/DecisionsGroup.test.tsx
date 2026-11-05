import type { Decision } from "@isnadi/client-runtime/decisions";
import { EnvironmentId, ThreadId } from "@isnadi/contracts";
import { isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

type ButtonProps = ComponentProps<"button"> & { size?: string };

vi.mock("../../i18n", () => ({
  useI18n: () => ({
    t: (message: string, values?: { count?: number }) =>
      message.replace("{count}", String(values?.count ?? "")),
  }),
}));

vi.mock("../../state/entities", () => ({ useDecisions: () => [] }));

vi.mock("../../state/environments", () => ({ usePrimaryEnvironmentId: () => null }));

vi.mock("../chat/useOpenChat", () => ({ useOpenChat: () => vi.fn() }));

vi.mock("./rosterStore", () => ({ useRosterStore: () => [] }));

vi.mock("./BotAvatarView", () => ({ BotAvatarView: () => <span data-testid="avatar" /> }));

vi.mock("../ui/sidebar", () => ({
  SidebarGroup: (props: ComponentProps<"div">) => <div {...props} />,
  SidebarGroupContent: (props: ComponentProps<"div">) => <div {...props} />,
  SidebarGroupLabel: (props: ComponentProps<"div">) => <div {...props} />,
  SidebarMenu: (props: ComponentProps<"ul">) => <ul {...props} />,
  SidebarMenuItem: (props: ComponentProps<"li">) => <li {...props} />,
  SidebarMenuButton: ({ size: _size, ...props }: ButtonProps) => <button {...props} />,
}));

import { DecisionsList } from "./DecisionsGroup";

function decision(id: string, kind: Decision["kind"], owner: Partial<Decision> = {}): Decision {
  return {
    environmentId: EnvironmentId.make("env-1"),
    threadId: ThreadId.make(id),
    targetThreadId: ThreadId.make(id),
    botId: "bot-a",
    groupId: null,
    title: `Chat ${id}`,
    kind,
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...owner,
  };
}

const ownerOf = (row: Decision) => ({
  name: row.botId === null ? "Design crew" : "Ada",
  avatar: null,
});

function list(decisions: Decision[], expanded = false) {
  const onOpen = vi.fn();
  const onExpand = vi.fn();

  const element = (
    <DecisionsList
      decisions={decisions}
      expanded={expanded}
      ownerOf={ownerOf}
      onOpen={onOpen}
      onExpand={onExpand}
    />
  );

  return { element, onOpen, onExpand };
}

/** Collects the buttons of the group's element tree, which has no hooks, so a click can be fired. */
function buttonsOf(decisions: Decision[]) {
  const { element, onOpen, onExpand } = list(decisions);
  const found: ReactElement<ButtonProps>[] = [];

  const visit = (node: ReactNode) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
    } else if (isValidElement<{ children?: ReactNode }>(node)) {
      if (node.type !== "bdi" && "onClick" in node.props)
        found.push(node as ReactElement<ButtonProps>);

      visit(node.props.children);
    }
  };

  visit(DecisionsList(element.props));

  return { found, onOpen, onExpand };
}

describe("DecisionsList", () => {
  it("says nothing is waiting when there are no decisions", () => {
    const markup = renderToStaticMarkup(list([]).element);

    expect(markup).toContain("Decisions");
    expect(markup).toContain("Nothing waiting on you");
    expect(markup).not.toContain("<button");
  });

  it("names each row by kind, owner, and title, for bots and groups", () => {
    const markup = renderToStaticMarkup(
      list([
        decision("t-1", "approval"),
        decision("t-2", "question", { botId: null, groupId: "group-g" }),
      ]).element,
    );

    expect(markup).toContain('aria-label="Approval needed: Ada · Chat t-1"');
    expect(markup).toContain('aria-label="Question: Design crew · Chat t-2"');
    expect(markup).toContain("<bdi");
  });

  it("opens exactly the clicked chat", () => {
    const rows = [decision("t-1", "approval"), decision("t-2", "question")];
    const { found, onOpen } = buttonsOf(rows);
    const second = found.find((el) => el.props["aria-label"] === "Question: Ada · Chat t-2");

    expect(second).toBeDefined();
    second?.props.onClick?.({} as never);

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(rows[1]);
  });

  it("shows five rows and Show all (n), then every row once expanded", () => {
    const rows = Array.from({ length: 7 }, (_, index) => decision(`t-${index}`, "question"));
    const collapsed = renderToStaticMarkup(list(rows).element);

    expect(collapsed.match(/aria-label=/g)).toHaveLength(5);
    expect(collapsed).toContain("Show all (7)");

    const open = renderToStaticMarkup(list(rows, true).element);

    expect(open.match(/aria-label=/g)).toHaveLength(7);
    expect(open).not.toContain("Show all");

    const { found, onExpand } = buttonsOf(rows);
    const showAll = found.find((el) => el.props.size === "sm");

    expect(showAll).toBeDefined();
    showAll?.props.onClick?.({} as never);
    expect(onExpand).toHaveBeenCalledTimes(1);
  });
});
