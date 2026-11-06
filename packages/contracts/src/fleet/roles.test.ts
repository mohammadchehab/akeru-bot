import { assert, it } from "@effect/vitest";
import * as Schema from "effect/Schema";
import { DEFAULT_MODEL_BY_PROVIDER, MODEL_SLUG_ALIASES_BY_PROVIDER } from "../model.ts";
import {
  FLEET_ROLES,
  FLEET_TEMPLATES,
  FleetRole,
  FleetTemplate,
  fleetRole,
  fleetTemplateRoles,
} from "./roles.ts";

const decodeRole = Schema.decodeUnknownSync(FleetRole);

const decodeTemplate = Schema.decodeUnknownSync(FleetTemplate);

it("every role decodes with its schema", () => {
  for (const role of FLEET_ROLES) {
    decodeRole(role);
  }
});

it("every template decodes with its schema", () => {
  for (const template of FLEET_TEMPLATES) {
    decodeTemplate(template);
  }
});

it("role ids are unique", () => {
  const ids = FLEET_ROLES.map((role) => role.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

it("every template's boss is one of its roles", () => {
  for (const template of FLEET_TEMPLATES) {
    assert.include(template.roleIds, template.bossRoleId, template.id);
  }
});

it("every template role id resolves", () => {
  for (const template of FLEET_TEMPLATES) {
    for (const roleId of template.roleIds) {
      assert.isDefined(fleetRole(roleId), `${template.id}: ${roleId}`);
    }
  }
});

it("fleetTemplateRoles returns the boss first, then the rest in card order", () => {
  const recruiting = FLEET_TEMPLATES.find((template) => template.id === "recruiting");
  assert.isDefined(recruiting);
  assert.deepStrictEqual(
    fleetTemplateRoles(recruiting!).map((role) => role.id),
    ["tracker", "scout", "tailor", "coach"],
  );
});

it("software engineering keeps the fleet role ids the architect triage matches on", () => {
  const software = FLEET_TEMPLATES.find((template) => template.id === "software-engineering");
  assert.isDefined(software);
  assert.isTrue(software!.roleIds.some((id) => id === "architect"));
});

it("every role model slug is a driver default or a known alias", () => {
  for (const role of FLEET_ROLES) {
    const { driver, model } = role.model;
    const aliases = MODEL_SLUG_ALIASES_BY_PROVIDER[driver] ?? {};

    const known =
      DEFAULT_MODEL_BY_PROVIDER[driver] === model ||
      Object.values(aliases).includes(model) ||
      Object.keys(aliases).includes(model);

    assert.isTrue(known, `${role.id}: ${driver}/${model}`);
  }
});

it("roles ship without skills until the registry lands", () => {
  for (const role of FLEET_ROLES) {
    assert.deepStrictEqual(role.skills, [], role.id);
  }
});
