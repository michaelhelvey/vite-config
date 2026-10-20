import { describe, expect, it } from "vitest";
import { defineConfig, FileTypes } from "./index.ts";

const overridesOf = (config: Awaited<ReturnType<typeof defineConfig>>) =>
  config.lint?.overrides ?? [];

const lastOverrideFor = (
  overrides: ReturnType<typeof overridesOf>,
  file: string,
): ReturnType<typeof overridesOf>[number] | undefined =>
  [...overrides].toReversed().find((override) => override.files.includes(file));

describe("defineConfig", () => {
  it("keeps the base overrides in order when the user sets no overrides", async () => {
    const overrides = overridesOf(await defineConfig());

    expect(overrides.map((override) => override.files)).toEqual([
      FileTypes.JS_SOURCE,
      FileTypes.REACT_SOURCE,
      FileTypes.TEST_SOURCE,
    ]);
  });

  it("appends user overrides after the base overrides", async () => {
    const overrides = overridesOf(
      await defineConfig({
        lint: {
          overrides: [
            { files: FileTypes.JS_SOURCE, rules: { "no-console": "off" } },
            { files: FileTypes.TEST_SOURCE, rules: { "vitest/no-standalone-expect": "off" } },
          ],
        },
      }),
    );

    expect(overrides).toHaveLength(5);
    expect(overrides[0]?.rules?.["no-console"]).toBe("error");
    expect(overrides[3]?.rules?.["no-console"]).toBe("off");
    expect(overrides[4]?.rules?.["vitest/no-standalone-expect"]).toBe("off");
  });

  it("enables the plugins that already apply to the files of the override", async () => {
    const overrides = overridesOf(
      await defineConfig({
        lint: {
          overrides: [
            { files: FileTypes.TEST_SOURCE, rules: { "vitest/no-standalone-expect": "off" } },
            { files: FileTypes.REACT_SOURCE, rules: { "react/jsx-key": "off" } },
          ],
        },
      }),
    );

    expect(overrides[3]?.plugins).toEqual(["vitest"]);
    expect(overrides[4]?.plugins).toEqual([
      "eslint",
      "oxc",
      "typescript",
      "promise",
      "unicorn",
      "react",
      "react-perf",
    ]);
  });

  it("lets a user override win over a base override for the same files", async () => {
    const overrides = overridesOf(
      await defineConfig({
        lint: {
          overrides: [
            { files: FileTypes.TEST_SOURCE, rules: { "vitest/no-standalone-expect": "off" } },
          ],
        },
      }),
    );

    // oxlint uses the last override that matches, so this value must be the last word.
    expect(lastOverrideFor(overrides, "*.test.ts")?.rules?.["vitest/no-standalone-expect"]).toBe(
      "off",
    );
  });
});
