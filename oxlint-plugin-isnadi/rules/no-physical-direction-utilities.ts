import { defineRule, type ESTree } from "@oxlint/plugins";
import * as Predicate from "effect/Predicate";

// The interface mirrors for right-to-left languages, so spacing, position, alignment, borders and
// radii must say start and end instead of left and right. This rule reads every string and
// template chunk, like no-raw-palette-strings, so variant tables and class helpers are covered.
// A horizontal translate has no logical form; it must carry an `rtl:` counterpart in the same
// string.

const SIDE_UTILITIES: ReadonlyArray<readonly [RegExp, (match: RegExpExecArray) => string]> = [
  [/^(-?)([mp])([lr])-(.+)$/u, (m) => `${m[1]}${m[2]}${m[3] === "l" ? "s" : "e"}-${m[4]}`],
  [
    /^(-?)(left|right)-(\d.*|\[.*|\(.*|px|full|auto)$/u,
    (m) => `${m[1]}${m[2] === "left" ? "start" : "end"}-${m[3]}`,
  ],
  [/^text-(left|right)$/u, (m) => `text-${m[1] === "left" ? "start" : "end"}`],
  [/^border-([lr])(-.+)?$/u, (m) => `border-${m[1] === "l" ? "s" : "e"}${m[2] ?? ""}`],
  [
    /^rounded-(l|r|tl|tr|bl|br)(-.+)?$/u,
    (m) => {
      const corner = { l: "s", r: "e", tl: "ss", tr: "se", bl: "es", br: "ee" }[m[1] ?? "l"];

      return `rounded-${corner}${m[2] ?? ""}`;
    },
  ],
  [/^scroll-([mp])([lr])-(.+)$/u, (m) => `scroll-${m[1]}${m[2] === "l" ? "s" : "e"}-${m[3]}`],
  [/^(float|clear)-(left|right)$/u, (m) => `${m[1]}-${m[2] === "left" ? "start" : "end"}`],
];

const TRANSLATE_X = /^-?translate-x-/u;

const MEASURED_POSITION = /^-?(?:left|right)-(?:\(--measured-|\[var\(--measured-)/u;

// Cheap pre-filter so ordinary strings skip tokenizing.
const MAY_CONTAIN_PHYSICAL =
  /(?:^|\s|:)!?-?(?:[mp][lr]-|left-|right-|text-(?:left|right)|border-[lr]|rounded-(?:l|r|tl|tr|bl|br)|scroll-[mp][lr]-|float-|clear-|translate-x-)/u;

// Variants end at the last `:` outside brackets and parentheses.
function splitVariants(token: string) {
  let depth = 0;
  let start = 0;

  for (let index = 0; index < token.length; index += 1) {
    const char = token[index];

    if (char === "[" || char === "(") depth += 1;
    else if (char === "]" || char === ")") depth = Math.max(0, depth - 1);
    else if (char === ":" && depth === 0) start = index + 1;
  }

  return { variants: token.slice(0, start), utility: token.slice(start) };
}

function stripImportant(utility: string) {
  const lead = utility.startsWith("!") ? "!" : "";
  const trail = utility.endsWith("!") ? "!" : "";
  const body = utility.slice(lead.length, utility.length - trail.length);

  return { bang: lead + trail, body };
}

function findViolations(text: string): ReadonlyArray<string> {
  if (!MAY_CONTAIN_PHYSICAL.test(text)) return [];

  const tokens = text.split(/\s+/u).filter((token) => token.length > 0);

  const hasRtlTranslate = tokens.some((token) => {
    const { variants, utility } = splitVariants(token);

    return variants.split(":").includes("rtl") && TRANSLATE_X.test(stripImportant(utility).body);
  });

  return tokens.flatMap((token) => {
    const { variants, utility } = splitVariants(token);
    const { body } = stripImportant(utility);

    if (TRANSLATE_X.test(body)) {
      return variants.split(":").includes("rtl") || hasRtlTranslate
        ? []
        : [
            `\`${token}\` moves an element along the horizontal axis, which does not mirror. Add the opposite \`rtl:\` translate in the same class list.`,
          ];
    }

    // A position measured in the browser (a pointer, a bounding box) is physical by nature, so a
    // custom property named `--measured-*`, such as `left-(--measured-thumb-left)`, is allowed. Any other
    // custom property (a layout inset, say) must still use `start` or `end`.
    if (MEASURED_POSITION.test(body)) return [];

    for (const [pattern, logical] of SIDE_UTILITIES) {
      const match = pattern.exec(body);

      if (match) {
        return [
          `\`${token}\` is a physical direction utility. Use \`${logical(match)}\` so it mirrors in right-to-left languages.`,
        ];
      }
    }

    return [];
  });
}

export default defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow physical left and right Tailwind utilities; use start and end so the layout mirrors.",
    },
  },
  create(context) {
    const report = (node: ESTree.Node, text: string) => {
      for (const message of findViolations(text)) context.report({ node, message });
    };

    return {
      Literal(node) {
        if (!Predicate.isString(node.value)) return;

        report(node, node.value);
      },
      TemplateElement(node) {
        report(node, node.value.cooked ?? node.value.raw);
      },
    };
  },
});
