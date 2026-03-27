import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { UserConfig } from "vite-plus";
import { RULES } from "./rules.ts";

type OxlintPluginType = (typeof RULES)[number]["scope"];
type OxlintCategoryType = (typeof RULES)[number]["category"];

interface CustomDefaultsEntry {
  categories: OxlintCategoryType[];
  plugins: OxlintPluginType[];
}

interface CustomDefaults {
  production_node: CustomDefaultsEntry;
  production_react: CustomDefaultsEntry;
  test: CustomDefaultsEntry;
}

/**
 * Mapping from a broad category of code "e.g. nodejs production code" to a list of categories and
 * oxlint plugins to enable.
 */
export const customOxlintDefaults: CustomDefaults = {
  production_node: {
    categories: ["correctness", "perf", "suspicious"],
    plugins: ["eslint", "oxc", "typescript", "promise"],
  },
  production_react: {
    categories: ["correctness", "perf", "suspicious"],
    plugins: ["eslint", "oxc", "typescript", "promise", "react", "react-perf", "jsx-a11y"],
  },
  test: {
    categories: ["correctness"],
    plugins: ["eslint", "oxc", "promise", "vitest"],
  },
};

type CustomOxlintCategory = keyof typeof customOxlintDefaults;

/**
 * Finds the root of the git repository, then loads any .gitignore files there, then returns a list
 * of glob patterns from it. Doesn't handle GIT_DIR or worktrees or any weird shit.
 */
export const ignoresFromGitIgnore = async (): Promise<string[]> => {
  const gitRoot = await new Promise<string>((resolve, reject) => {
    const cp = spawn("git", ["rev-parse", "--show-toplevel"], { stdio: "pipe" });
    cp.on("error", reject);

    cp.stdout?.on("data", (pathBuf: Buffer) => {
      resolve(pathBuf.toString("utf-8").trim());
    });
  });

  const gitIgnorePath = path.join(gitRoot, ".gitignore");
  const gitIgnoreExists = await fs.promises
    .access(gitIgnorePath, fs.constants.R_OK)
    .then(() => true)
    .catch(() => false);

  if (gitIgnoreExists) {
    const gitIgnoreContents = await fs.promises.readFile(gitIgnorePath, "utf-8");
    return gitIgnoreContents.split(/\s/);
  }

  return [];
};

export const pluginsForCategory = (category: CustomOxlintCategory) =>
  customOxlintDefaults[category].plugins;
export const rulesForCategory = (category: CustomOxlintCategory) => {
  const rules: Record<string, "error"> = {};
  const config = customOxlintDefaults[category];

  for (const rule of RULES) {
    if (config.plugins.includes(rule.scope) && config.categories.includes(rule.category)) {
      rules[`${rule.scope}/${rule.value}`] = "error";
    }
  }

  return rules;
};

const DEFAULT_STAGED: UserConfig["staged"] = {
  "*": "vp check --fix",
};

const DEFAULT_FMT: UserConfig["fmt"] = {
  sortImports: {
    customGroups: [
      { groupName: "builtin", selector: "builtin" },
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
};

const DEFAULT_LINT: UserConfig["lint"] = {
  ignorePatterns: await ignoresFromGitIgnore(),
  plugins: pluginsForCategory("production_node"),
  rules: rulesForCategory("production_node"),
  overrides: [
    {
      files: ["**/*.tsx"],
      plugins: pluginsForCategory("production_react"),
      rules: rulesForCategory("production_react"),
    },
    {
      files: ["*/*.test.*"],
      plugins: pluginsForCategory("test"),
      rules: rulesForCategory("test"),
    },
  ],
  options: {
    typeAware: true,
    typeCheck: true,
  },
};

const DEFAULT_TEST: UserConfig["test"] = {
  passWithNoTests: true,
  unstubGlobals: true,
  unstubEnvs: true,
  mockReset: true,
};

const DEFAULT_USER_CONFIG: UserConfig = {
  staged: DEFAULT_STAGED,
  fmt: DEFAULT_FMT,
  lint: DEFAULT_LINT,
  test: DEFAULT_TEST,
};

export default DEFAULT_USER_CONFIG;
