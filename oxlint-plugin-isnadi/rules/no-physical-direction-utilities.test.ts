import { assert, describe } from "@effect/vitest";

import { createOxlintRuleHarness } from "../test/utils.ts";

const rule = createOxlintRuleHarness("isnadi/no-physical-direction-utilities", {
  filename: "fixture.tsx",
});

describe("isnadi/no-physical-direction-utilities", () => {
  rule.valid(
    "allows logical spacing, position, alignment, borders and radii",
    `const el = <div className="ms-2 me-auto ps-3 pe-1 start-0 end-4 text-start border-s border-e-2 rounded-s-lg rounded-ee-md" />;`,
  );

  rule.valid(
    "allows symmetric and vertical utilities",
    `const el = <div className="mx-2 px-3 inset-x-0 top-0 bottom-2 -mt-1 text-center border-t rounded-t-lg" />;`,
  );

  rule.valid(
    "allows a measured position held in a custom property",
    `const cls = "absolute left-(--measured-tooltip-left,0px) top-(--tooltip-top) -right-[var(--measured-thumb-right)]";`,
  );

  rule.invalid(
    "still reports a layout inset held in a custom property",
    `const cls = "fixed left-(--workspace-controls-left) right-[var(--inset)]";`,
    (output) => {
      assert.match(
        output,
        /`left-\(--workspace-controls-left\)`.*`start-\(--workspace-controls-left\)`/,
      );
      assert.match(output, /`right-\[var\(--inset\)\]`/);
    },
  );

  rule.invalid(
    "still reports a fixed left offset",
    `const cls = "left-4 right-(--measured-x) -left-px";`,
    (output) => {
      assert.match(output, /`left-4`.*`start-4`/);
      assert.match(output, /`-left-px`.*`-start-px`/);
      assert.isFalse(/measured-x/.test(output));
    },
  );

  rule.valid(
    "allows prose that mentions left and right",
    `const copy = "Click the right arrow, then pick the left-hand panel.";`,
  );

  rule.valid(
    "allows a horizontal transform that carries its rtl counterpart",
    `const cls = "start-1/2 -translate-x-1/2 rtl:translate-x-1/2";`,
  );

  rule.invalid(
    "reports physical margin and padding",
    `const cls = "ml-2 mr-auto pl-3 pr-1 -ml-px";`,
    (output) => {
      assert.match(output, /`ml-2` is a physical direction utility. Use `ms-2`/);
      assert.match(output, /`mr-auto`.*`me-auto`/);
      assert.match(output, /`pl-3`.*`ps-3`/);
      assert.match(output, /`pr-1`.*`pe-1`/);
      assert.match(output, /`-ml-px`.*`-ms-px`/);
    },
  );

  rule.invalid(
    "reports physical inset",
    `const cls = "left-0 right-2 -left-1 left-1/2 right-[3px] left-full";`,
    (output) => {
      assert.match(output, /`left-0`.*`start-0`/);
      assert.match(output, /`right-2`.*`end-2`/);
      assert.match(output, /`-left-1`.*`-start-1`/);
      assert.match(output, /`left-1\/2`/);
      assert.match(output, /`right-\[3px\]`/);
      assert.match(output, /`left-full`/);
    },
  );

  rule.invalid("reports physical alignment", `const cls = "text-left text-right";`, (output) => {
    assert.match(output, /`text-left`.*`text-start`/);
    assert.match(output, /`text-right`.*`text-end`/);
  });

  rule.invalid(
    "reports physical borders and radii",
    `const cls = "border-l border-r-2 rounded-l-md rounded-tr-lg rounded-bl rounded-r";`,
    (output) => {
      assert.match(output, /`border-l`.*`border-s`/);
      assert.match(output, /`border-r-2`.*`border-e-2`/);
      assert.match(output, /`rounded-l-md`.*`rounded-s-md`/);
      assert.match(output, /`rounded-tr-lg`.*`rounded-se-lg`/);
      assert.match(output, /`rounded-bl`.*`rounded-es`/);
      assert.match(output, /`rounded-r`.*`rounded-e`/);
    },
  );

  rule.invalid(
    "reports physical utilities behind variants and arbitrary selectors",
    `const cls = "sm:ml-2 hover:text-left [&_svg]:pr-1 data-[open]:left-0!";`,
    (output) => {
      assert.match(output, /`sm:ml-2`/);
      assert.match(output, /`hover:text-left`/);
      assert.match(output, /`\[&_svg\]:pr-1`/);
      assert.match(output, /`data-\[open\]:left-0!`/);
    },
  );

  rule.invalid(
    "reports a horizontal transform without an rtl counterpart",
    `const cls = "start-1/2 -translate-x-1/2";`,
    (output) => {
      assert.match(output, /`-translate-x-1\/2`.*`rtl:`/);
    },
  );

  rule.invalid(
    "reports in template literals and variant tables",
    'const a = `flex ${on ? "" : ""} pl-2`; const b = { open: "right-0" };',
    (output) => {
      assert.match(output, /`pl-2`/);
      assert.match(output, /`right-0`/);
    },
  );
});
