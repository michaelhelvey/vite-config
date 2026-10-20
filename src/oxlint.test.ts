import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { defineConfig, FileTypes } from "./index.ts";

/**
 * A test file that calls `expect` outside of a test block. The `vitest/no-standalone-expect` rule
 * reports this pattern.
 */
const fixture = `import { expect } from "vitest";

expect(1).toBe(1);
`;

const oxlintBin = path.resolve("node_modules/.bin/oxlint");

let tempDir = "";
let fixturePath = "";
let configPath = "";

type Overrides = NonNullable<
  NonNullable<Awaited<ReturnType<typeof defineConfig>>["lint"]>["overrides"]
>;

/** Runs oxlint with the given overrides and returns its output. */
const lintWith = (overrides?: Overrides) => {
  // The real config enables plugins inside the overrides, not at the root, so the root stays empty.
  const config = { overrides: overrides ?? [] };
  fs.writeFileSync(configPath, JSON.stringify(config));

  const result = spawnSync(oxlintBin, ["-c", configPath, fixturePath], { encoding: "utf-8" });
  return `${result.stdout}${result.stderr}`;
};

beforeAll(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vite-config-"));
  fixturePath = path.join(tempDir, "standalone.test.ts");
  configPath = path.join(tempDir, "oxlint.json");
  fs.writeFileSync(fixturePath, fixture);
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("lint overrides", () => {
  it("reports a standalone expect with the base config", async () => {
    const config = await defineConfig();

    expect(lintWith(config.lint?.overrides)).toContain("vitest(no-standalone-expect)");
  });

  it("turns the rule off when a user override sets it to off", async () => {
    const config = await defineConfig({
      lint: {
        overrides: [
          { files: FileTypes.TEST_SOURCE, rules: { "vitest/no-standalone-expect": "off" } },
        ],
      },
    });

    const output = lintWith(config.lint?.overrides);

    expect(output).not.toContain("vitest(no-standalone-expect)");
  });
});
