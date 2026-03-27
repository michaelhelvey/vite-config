/**
 **************************************************************************************************
 * Quick and dirty script to scrape rules from https://oxc.rs/docs/guide/usage/linter/rules.html
 *
 * As far as I can tell, this is a VitePress website.  For some reason, it is not server-side
 * rendered, so you can't simply parse the HTML to get the rules.  Even more confusingly, I cannot
 * find an export of the rules as JS objects anywhere in the official OxFmt packages.
 *
 * I simply want to be able to iterate over the rules in code in order to craft custom rule sets
 * without having to manually type out every single rule, just like I could in ESLint.
 **************************************************************************************************
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { $ } from "execa";
import * as z from "zod";

async function getOxcRulesChunkUrl() {
  const html = await fetch("https://oxc.rs/docs/guide/usage/linter/rules.html").then((r) =>
    r.text(),
  );
  const match = html.match(/\/assets\/chunks\/rules\.[^"]+\.js/);
  if (!match) throw new Error("Could not find rules chunk URL");
  return `https://oxc.rs${match[0]}`;
}

const fixSchema = z.enum([
  "conditional_dangerous_fix",
  "conditional_dangerous_fix_or_suggestion",
  "conditional_fix",
  "conditional_safe_fix_or_suggestion",
  "conditional_suggestion",
  "fixable_dangerous_fix",
  "fixable_dangerous_fix_or_suggestion",
  "fixable_dangerous_suggestion",
  "fixable_fix",
  "fixable_safe_fix_or_suggestion",
  "fixable_suggestion",
  "none",
  "pending",
]);

const rulesSchema = z.object({
  scope: z.string().transform((value) => value.replaceAll("_", "-")),
  value: z.string(),
  category: z.string(),
  type_aware: z.boolean(),
  fix: fixSchema,
  default: z.boolean(),
  docs_url: z.string(),
});

type Rule = z.infer<typeof rulesSchema>;

async function extractRulesFromChunkUrl(url: string): Promise<Rule[]> {
  const response = await fetch(url);
  assert.ok(response.ok);
  assert.ok(response.status === 200);

  const js = await response.text();

  const matcher = new RegExp("JSON\\.parse\\(`(.*)`", "gms");
  const match = matcher.exec(js);
  assert.ok(match);
  assert.ok(match[1]);

  const raw = JSON.parse(match[1]) as unknown;
  return rulesSchema.array().parse(raw);
}

async function main() {
  const rulesChunkUrl = await getOxcRulesChunkUrl();
  const json = await extractRulesFromChunkUrl(rulesChunkUrl);

  const rulesFilePath = path.join(process.cwd(), "src/rules.ts");
  await fs.promises.writeFile(
    rulesFilePath,
    `export const RULES = ${JSON.stringify(json, null, 2)} as const`,
  );
  await $`bunx vp fmt --write ${rulesFilePath}`;
}

if (import.meta.main) {
  await main();
}
