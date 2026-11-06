import * as Schema from "effect/Schema";

import { TrimmedNonEmptyString } from "../baseSchemas.ts";
import { DEFAULT_MODEL_BY_PROVIDER } from "../model.ts";
import { BotAvatar } from "../orchestration/roster.ts";
import { ProviderDriverKind } from "../providerInstance.ts";
import { SkillId } from "../routines.ts";

export const FleetRoleId = TrimmedNonEmptyString.pipe(Schema.brand("FleetRoleId"));

export type FleetRoleId = typeof FleetRoleId.Type;

export const FleetTemplateId = TrimmedNonEmptyString.pipe(Schema.brand("FleetTemplateId"));

export type FleetTemplateId = typeof FleetTemplateId.Type;

export const FleetReasoningLevel = Schema.Literals(["low", "medium", "high"]);

export type FleetReasoningLevel = typeof FleetReasoningLevel.Type;

/**
 * A role names a driver kind, never a provider instance: instances differ per
 * environment, so squad setup resolves the driver to one at hire time.
 */
export const FleetRole = Schema.Struct({
  id: FleetRoleId,
  name: TrimmedNonEmptyString,
  description: TrimmedNonEmptyString,
  avatar: BotAvatar,
  model: Schema.Struct({ driver: ProviderDriverKind, model: TrimmedNonEmptyString }),
  reasoning: FleetReasoningLevel,
  skills: Schema.Array(SkillId),
});

export type FleetRole = typeof FleetRole.Type;

export const FleetTemplateIcon = Schema.Literals([
  "user-plus",
  "play",
  "terminal",
  "flask-conical",
  "messages-square",
  "file-text",
]);

/** `roleIds` is in card order and includes the boss. */
export const FleetTemplate = Schema.Struct({
  id: FleetTemplateId,
  name: TrimmedNonEmptyString,
  description: TrimmedNonEmptyString,
  icon: FleetTemplateIcon,
  bossRoleId: FleetRoleId,
  roleIds: Schema.NonEmptyArray(FleetRoleId),
});

export type FleetTemplate = typeof FleetTemplate.Type;

const CLAUDE = ProviderDriverKind.make("claudeAgent");

const CODEX = ProviderDriverKind.make("codex");

const GROK = ProviderDriverKind.make("grok");

const OPUS = "claude-opus-5-5";

const SONNET = "claude-sonnet-5-5";

const defaultModel = (driver: ProviderDriverKind): string => {
  const model = DEFAULT_MODEL_BY_PROVIDER[driver];

  if (!model) throw new Error(`No default model for driver ${driver}.`);

  return model;
};

// Avatar colours are the roster's BLOB_COLORS palette.
const BLUE = "#2E8EFF";

const PURPLE = "#9A68FF";

const TEAL = "#1FBFAE";

const ORANGE = "#FF7A1F";

const GREEN = "#16C47A";

const RED = "#FF4A5A";

const PINK = "#FF4FA8";

const AMBER = "#FFA826";

const BROWN = "#A0764F";

const GREY = "#8E8E93";

type Shape = Extract<BotAvatar, { kind: "blob" }>["shape"];

const role = (
  id: string,
  name: string,
  description: string,
  avatar: readonly [Shape, string],
  model: readonly [ProviderDriverKind, string],
  reasoning: FleetReasoningLevel,
): FleetRole => ({
  id: FleetRoleId.make(id),
  name,
  description,
  avatar: { kind: "blob", shape: avatar[0], color: avatar[1] },
  model: { driver: model[0], model: model[1] },
  reasoning,
  skills: [],
});

const claudeOpus = [CLAUDE, OPUS] as const;

const claudeSonnet = [CLAUDE, SONNET] as const;

const codex = [CODEX, defaultModel(CODEX)] as const;

const grok = [GROK, defaultModel(GROK)] as const;

/** Display order. Skills stay empty until the skill registry (TASK-123.2) has ids to name. */
export const FLEET_ROLES: ReadonlyArray<FleetRole> = [
  // Recruiting
  role("scout", "Scout", "Sources candidates", ["circle", BLUE], claudeOpus, "high"),
  role("tailor", "Tailor", "Job posts and outreach", ["squircle", PURPLE], claudeSonnet, "medium"),
  role("tracker", "Tracker", "Pipeline and follow-ups", ["hex", TEAL], codex, "medium"),
  role("coach", "Coach", "Interview kits", ["cloud", ORANGE], grok, "low"),
  // Video editing
  role("producer", "Producer", "Plans the cut and the schedule", ["pill", AMBER], codex, "medium"),
  role("editor", "Editor", "Cuts footage into a story", ["square", RED], claudeOpus, "high"),
  role("captioner", "Captioner", "Captions and subtitles", ["drop", GREEN], claudeSonnet, "low"),
  role(
    "designer",
    "Designer",
    "Thumbnails and title cards",
    ["triangle", PINK],
    claudeSonnet,
    "medium",
  ),
  // Software engineering
  role("planner", "Planner", "Plans the work and assigns it", ["hex", PURPLE], claudeOpus, "high"),
  role("engineer", "Engineer", "Builds and tests changes", ["squircle", BLUE], codex, "high"),
  role(
    "reviewer",
    "Reviewer",
    "Reviews and merges pull requests",
    ["circle", GREEN],
    codex,
    "medium",
  ),
  role(
    "architect",
    "Architect",
    "Designs and finds root causes",
    ["square", TEAL],
    claudeOpus,
    "high",
  ),
  role(
    "ui-designer",
    "UI designer",
    "Screens and design specs",
    ["cloud", PINK],
    claudeSonnet,
    "medium",
  ),
  role(
    "security-reviewer",
    "Security reviewer",
    "Reviews security-relevant changes",
    ["triangle", RED],
    claudeOpus,
    "high",
  ),
  // Health research
  role(
    "lead-researcher",
    "Lead researcher",
    "Frames questions and signs off findings",
    ["hex", TEAL],
    claudeOpus,
    "high",
  ),
  role(
    "literature-scout",
    "Literature scout",
    "Finds and screens papers",
    ["circle", BLUE],
    claudeSonnet,
    "medium",
  ),
  role(
    "trials-analyst",
    "Trials analyst",
    "Reads trial registries",
    ["squircle", AMBER],
    codex,
    "medium",
  ),
  role(
    "data-analyst",
    "Data analyst",
    "Runs the numbers on public data",
    ["pill", PURPLE],
    codex,
    "high",
  ),
  // Customer support
  role("triage", "Triage", "Sorts the inbox and routes it", ["drop", ORANGE], claudeSonnet, "low"),
  role("responder", "Responder", "Drafts replies", ["circle", GREEN], claudeSonnet, "medium"),
  role(
    "escalations",
    "Escalations",
    "Handles the hard cases",
    ["triangle", RED],
    claudeOpus,
    "high",
  ),
  role("knowledge", "Knowledge", "Keeps help articles current", ["cloud", BLUE], grok, "low"),
  // Bookkeeping & procurement
  role(
    "controller",
    "Controller",
    "Approves spend and closes the books",
    ["hex", BROWN],
    claudeOpus,
    "high",
  ),
  role(
    "bookkeeper",
    "Bookkeeper",
    "Records spend and matches invoices",
    ["square", GREY],
    codex,
    "medium",
  ),
  role("buyer", "Buyer", "Runs purchase requests", ["squircle", AMBER], claudeSonnet, "medium"),
  role("auditor", "Auditor", "Checks entries for mistakes", ["circle", PURPLE], codex, "high"),
];

const template = (
  id: string,
  name: string,
  description: string,
  icon: typeof FleetTemplateIcon.Type,
  bossRoleId: string,
  roleIds: readonly [string, ...string[]],
): FleetTemplate => ({
  id: FleetTemplateId.make(id),
  name,
  description,
  icon,
  bossRoleId: FleetRoleId.make(bossRoleId),
  roleIds: [FleetRoleId.make(roleIds[0]), ...roleIds.slice(1).map((id) => FleetRoleId.make(id))],
});

/** Display order. `roleIds` follows the card on screen 1. */
export const FLEET_TEMPLATES: ReadonlyArray<FleetTemplate> = [
  template(
    "recruiting",
    "Recruiting",
    "Sources candidates, writes outreach, and tracks every opening.",
    "user-plus",
    "tracker",
    ["scout", "tailor", "tracker", "coach"],
  ),
  template(
    "video-editing",
    "Video editing",
    "Turns raw footage into cut, captioned, publish-ready videos.",
    "play",
    "producer",
    ["producer", "editor", "captioner", "designer"],
  ),
  template(
    "software-engineering",
    "Software engineering",
    "Plans, builds, reviews, and ships changes in your repository.",
    "terminal",
    "planner",
    ["planner", "engineer", "reviewer", "architect", "ui-designer", "security-reviewer"],
  ),
  template(
    "health-research",
    "Health research",
    "Searches public health data, screens evidence, and summarises what holds up.",
    "flask-conical",
    "lead-researcher",
    ["lead-researcher", "literature-scout", "trials-analyst", "data-analyst"],
  ),
  template(
    "customer-support",
    "Customer support",
    "Triages the inbox, answers what it can, and escalates the rest.",
    "messages-square",
    "triage",
    ["triage", "responder", "escalations", "knowledge"],
  ),
  template(
    "bookkeeping-procurement",
    "Bookkeeping & procurement",
    "Records spend, matches invoices, and runs purchase requests.",
    "file-text",
    "controller",
    ["controller", "bookkeeper", "buyer", "auditor"],
  ),
];

export const fleetRole = (id: string): FleetRole | undefined =>
  FLEET_ROLES.find((candidate) => candidate.id === id);

/** The template's roles with the boss first, then the rest in card order. */
export const fleetTemplateRoles = (template: FleetTemplate): ReadonlyArray<FleetRole> => {
  const ordered = [
    template.bossRoleId,
    ...template.roleIds.filter((id) => id !== template.bossRoleId),
  ];

  return ordered.flatMap((id) => {
    const found = fleetRole(id);

    return found ? [found] : [];
  });
};
