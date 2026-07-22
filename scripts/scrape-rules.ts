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
import { JSDOM } from "jsdom";
import * as z from "zod";

const rulesSchema = z.object({
  name: z.string(),
  source: z.string(),
  category: z.string(),
  default: z.boolean().default(false),
  fixable: z.boolean().default(false),
  version: z.string(),
});

type Rule = z.infer<typeof rulesSchema>;

function parseRulesFromHtml(html: string): unknown[] {
  const parser = new JSDOM(html);

  const ruleElements = parser.window.document.querySelectorAll("table tr");
  const rules = [];

  for (const ruleEl of ruleElements) {
    const [name, source, category, isDefault, fixable, version] = Array.from(
      ruleEl.getElementsByTagName("td"),
    ).map((e) => e.textContent.replaceAll("💭", ""));

    if (!name) continue;

    rules.push({
      name,
      source,
      category,
      default: Boolean(isDefault?.trim()),
      fixable: Boolean(fixable?.trim()),
      version,
    });
  }

  return rules;
}

async function extractRulesFromPage(url: string): Promise<Rule[]> {
  const response = await fetch(url);
  assert.ok(response.ok);
  assert.ok(response.status === 200);

  const html = await response.text();

  const raw = parseRulesFromHtml(html);
  return rulesSchema.array().parse(raw);
}

async function main() {
  const json = await extractRulesFromPage("https://oxc.rs/docs/guide/usage/linter/rules.html");

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
