import fs from "node:fs";
import path from "node:path";
import { $ } from "execa";
import merge from "lodash.merge";
import type { UserConfig } from "vite-plus";
import { DummyRuleMap } from "vite-plus/lint";
import { RULES } from "./rules.ts";

/**
 * A single lint rule entry as it appears in the `RULES` collection.
 *
 * @example
 * ```ts
 * import type { Rule } from "@michaelhelvey/vite-config";
 *
 * const rule: Rule = {
 *   name: "no-console",
 *   source: "eslint",
 *   category: "correctness",
 *   default: false,
 *   fixable: false,
 *   version: "v1.33.0",
 * };
 * ```
 */
export type Rule = (typeof RULES)[number];

/**
 * The plugin or tool that provides a given rule (e.g. `"eslint"`, `"oxc"`, `"typescript"`).
 *
 * @example
 * ```ts
 * import { ruleSelector, type RuleSource } from "@michaelhelvey/vite-config";
 *
 * const sources: RuleSource[] = ["eslint", "oxc"];
 * const rules = ruleSelector(sources, ["correctness"]);
 * ```
 */
export type RuleSource = Rule["source"];

/**
 * The category a rule falls under (e.g. `"correctness"`, `"perf"`, `"suspicious"`).
 *
 * @example
 * ```ts
 * import { ruleSelector, type RuleCategory } from "@michaelhelvey/vite-config";
 *
 * const categories: RuleCategory[] = ["correctness", "perf"];
 * const rules = ruleSelector(["eslint"], categories);
 * ```
 */
export type RuleCategory = Rule["category"];

/**
 * The name of a rule recognized by vite-plus's lint system.
 *
 * @example
 * ```ts
 * import type { RuleName } from "@michaelhelvey/vite-config";
 *
 * const rule: RuleName = "no-console";
 * ```
 */
export type RuleName = keyof DummyRuleMap;

type GenericRule = {
  name: string;
  source: string;
  category: string;
  default: boolean;
  fixable: boolean;
  version: string;
};

type AllowWarnDeny = ("allow" | "off" | "warn" | "error" | "deny") | number;

/**
 * Selects the union of a given set of sources and categories. For example, if `sources` is "eslint"
 * and "oxc", and `categories` is "correctness" and "perf", this will select all the rules for
 * correctness AND perf where the source is eslint OR oxc.
 *
 * @param sources - The rule sources (plugins) to include.
 * @param categories - The rule categories to include.
 * @param setting - The severity to apply. Defaults to `"error"`.
 * @returns A `DummyRuleMap` mapping rule names to the given severity.
 *
 * @example
 * ```ts
 * import { ruleSelector } from "@michaelhelvey/vite-config";
 *
 * // Enable all correctness rules from eslint and oxc as errors:
 * const rules = ruleSelector(["eslint", "oxc"], ["correctness"]);
 * // => { "no-console": "error", "oxc/no-console": "error", ... }
 *
 * // Disable all suspicious typescript rules for test files:
 * const testRules = ruleSelector(["typescript"], ["suspicious"], "off");
 * ```
 */
export const ruleSelector = (
  sources: RuleSource[],
  categories: RuleCategory[],
  setting: AllowWarnDeny = "error",
) => {
  const rules: GenericRule[] = [];

  for (const r of RULES) {
    if (categories.includes(r.category) && sources.includes(r.source)) {
      rules.push(r);
    }
  }

  return rules.reduce<DummyRuleMap>((a, c) => {
    if (c.source === "eslint") {
      a[c.name] = setting;
    } else {
      a[`${c.source}/${c.name}`] = setting;
    }
    return a;
  }, {});
};

// gitRoot...like you're _getting_ the _git_ root, got it, lol, hahaha, see this is how you know
// this code isn't LLM generated, because LLMs don't have my incredible sense of humor.
const gitRoot = async () => {
  const { stdout, exitCode } = await $({ reject: false })`git rev-parse --show-toplevel`;
  if (exitCode !== 0) {
    return { type: "ERROR", code: exitCode } as const;
  }

  return { type: "ROOT_FOUND", root: stdout.trim() } as const;
};

const readFile = async (path: string) => {
  try {
    const contents = await fs.promises.readFile(path, "utf-8");
    return { type: "CONTENTS", contents } as const;
  } catch {
    return { type: "ERROR" } as const;
  }
};

const ignorePatternsFromGitIgnore = async () => {
  const gitInfo = await gitRoot();
  if (gitInfo.type === "ERROR") {
    return [];
  }

  const gitIgnorePath = path.join(gitInfo.root, ".gitignore");
  const gitIgnore = await readFile(gitIgnorePath);

  if (gitIgnore.type === "ERROR") {
    return [];
  }

  return gitIgnore.contents.split(/\s/);
};

/**
 * Glob patterns for common file categories, intended to be used as `files` values
 * inside `lint.overrides`.
 *
 * @example
 * ```ts
 * import { defineConfig, FileTypes } from "@michaelhelvey/vite-config";
 *
 * export default defineConfig({
 *   lint: {
 *     overrides: [
 *       { files: FileTypes.JS_SOURCE, rules: { "no-console": "error" } },
 *       { files: FileTypes.REACT_SOURCE, rules: { "react/jsx-key": "error" } },
 *       { files: FileTypes.TEST_SOURCE, rules: { "vitest/no-disabled-tests": "error" } },
 *     ],
 *   },
 * });
 * ```
 */
export const FileTypes = {
  // The most general case: all javascript code should be matched by this:
  JS_SOURCE: ["*.ts", "*.tsx", "*.js", "*.jsx"],
  // specifically react(ish) code:
  REACT_SOURCE: ["*.tsx"],
  // test code:
  TEST_SOURCE: ["*.test.tsx", "*.spec.tsx", "*.test.ts", "*.spec.ts"],
};

type LintOverride = NonNullable<NonNullable<UserConfig["lint"]>["overrides"]>[number];

const matchesFile = (files: readonly string[] | undefined, target: readonly string[]) =>
  (files ?? []).some((file) => target.includes(file));

/**
 * Enables the plugins that already apply to the files of the override.
 *
 * Oxlint applies a rule in an override only if the same override also enables the plugin of that
 * rule. A user override usually omits `plugins`, because a base override already enables them for
 * the same files. This function copies those plugin names into the override, so the user rule takes
 * effect. Plugins that no base override enables for these files stay absent. Declare them yourself
 * in that case.
 */
const withBasePlugins = (base: UserConfig, override: LintOverride): LintOverride => {
  const inherited = (base.lint?.overrides ?? [])
    .filter((candidate) => matchesFile(candidate.files, override.files))
    .flatMap((candidate) => candidate.plugins ?? []);
  const plugins = [...new Set([...inherited, ...(override.plugins ?? [])])];

  return plugins.length === 0 ? override : { ...override, plugins };
};

/**
 * Merges the base config and the user config.
 *
 * `lodash.merge` merges arrays by index. That behavior is wrong for `lint.overrides`: if the user
 * override at index 1 sets a rule to `"off"`, the base override at index 2 can set the same rule
 * back to `"error"`, because oxlint uses the last override that matches. The base config owns
 * indices 0 to 2, so a user override would merge into the React override and lose.
 *
 * This helper appends the user overrides after the base overrides. A user rule then always comes
 * last, so it wins. The helper also enables the plugins that already apply to the files of the
 * override, because oxlint ignores a rule in an override that does not enable its plugin.
 */
const mergeUserConfig = (base: UserConfig, overrides?: UserConfig): UserConfig => {
  const userOverrides = overrides?.lint?.overrides;

  if (!userOverrides) {
    return merge(base, overrides ?? {});
  }

  // `lodash.merge` skips a source value of `undefined`, so the base overrides stay untouched.
  const merged: UserConfig = merge(base, {
    ...overrides,
    lint: { ...overrides?.lint, overrides: undefined },
  });

  merged.lint = {
    ...merged.lint,
    overrides: [
      ...(base.lint?.overrides ?? []),
      ...userOverrides.map((o) => withBasePlugins(base, o)),
    ],
  };

  return merged;
};

/**
 * Returns a `UserConfig` for `vite-plus` pre-configured with sensible defaults for
 * testing, linting, formatting, and staged-file checks. Pass an `overrides` object
 * to deep-merge your own settings on top of the base config. Entries in
 * `lint.overrides` are appended after the base entries, so a user entry always wins.
 *
 * @param overrides - Optional partial `UserConfig` to deep-merge into the base config.
 * @returns A promise that resolves to the final `UserConfig`.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from "@michaelhelvey/vite-config";
 *
 * export default defineConfig({
 *   // your overrides here
 *   test: { environment: "jsdom" },
 * });
 * ```
 */
export const defineConfig = async (overrides?: UserConfig): Promise<UserConfig> => {
  const base: UserConfig = {
    test: {
      passWithNoTests: true,
      unstubGlobals: true,
      unstubEnvs: true,
      mockReset: true,
    },
    lint: {
      settings: {
        react: {
          version: "19.2.8",
        },
      },
      env: {
        browser: true,
        builtin: true,
        es2024: true,
        node: true,
      },
      options: {
        typeAware: true,
        typeCheck: true,
      },
      ignorePatterns: await ignorePatternsFromGitIgnore(),
      overrides: [
        {
          files: FileTypes.JS_SOURCE,
          plugins: ["eslint", "oxc", "typescript", "promise", "unicorn"],
          rules: {
            ...ruleSelector(
              ["eslint", "oxc", "typescript", "promise", "unicorn"],
              ["correctness", "perf", "suspicious"],
            ),
            "typescript/no-misused-promises": "error",
            "no-shadow": "off",
            "no-console": "error",
          },
        },
        {
          files: FileTypes.REACT_SOURCE,
          plugins: ["react", "react-perf"],
          rules: {
            ...ruleSelector(["react"], ["correctness", "perf", "suspicious"]),
            "react/react-in-jsx-scope": "off",
          },
        },
        {
          files: FileTypes.TEST_SOURCE,
          plugins: ["vitest"],
          rules: {
            ...ruleSelector(["vitest"], ["correctness", "perf", "suspicious"]),
            // suspicious has most of the annoying rules for tests in it, like
            // no-unsafe-type-assertion etc.
            ...ruleSelector(["typescript"], ["suspicious"], "off"),
          },
        },
      ],
    },
    fmt: {
      sortImports: {
        customGroups: [
          { groupName: "builtins", selector: "builtin" },
          { groupName: "thirdparty", selector: "external" },
          { groupName: "everything-else", elementNamePattern: ["*"] },
        ],
        newlinesBetween: false,
        sortPackageJson: true,
      },
      printWidth: 100,
      proseWrap: "always",
      semi: true,
      singleQuote: false,
      tabWidth: 2,
      trailingComma: "all",
      useTabs: false,
    },
    staged: {
      "*": "vp check --fix",
    },
  };

  return mergeUserConfig(base, overrides);
};

/**
 * The full list of lint rules supported by this configuration, including each rule's
 * `source` (plugin), `category`, whether it is enabled by `default`, whether it is
 * `fixable`, and the `version` it was introduced in.
 *
 * @example
 * ```ts
 * import { RULES, type Rule } from "@michaelhelvey/vite-config";
 *
 * const reactRules: Rule[] = RULES.filter((r) => r.source === "react");
 * const fixablePerfRules = RULES.filter((r) => r.fixable && r.category === "perf");
 * ```
 */
export { RULES };
