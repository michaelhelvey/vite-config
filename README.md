# @michaelhelvey/vite-config

Opinionated, shareable [vite-plus](https://github.com/nicolo-ribaudo/vite-plus) defaults for
TypeScript projects. One import gives you sane formatting, linting, testing, and pre-commit hook
configuration — no per-project bikeshedding required.

## Install

```sh
npm install -D @michaelhelvey/vite-config vite-plus
```

## Usage

In your `vite.config.ts`:

```ts
import { defineConfig } from "vite-plus";
import defaults from "@michaelhelvey/vite-config";

export default defineConfig({
  ...defaults,
  // override anything you need
});
```

That's it. You now have working `vp fmt`, `vp check`, and `vp test` commands with the defaults
below, plus a pre-commit hook that runs `vp check --fix` on staged files.

## What's included

### Formatting (`fmt`)

Powered by [oxfmt](https://github.com/nicolo-ribaudo/oxfmt) via vite-plus:

- 100 character print width
- Semicolons, double quotes, trailing commas
- 2-space indentation, no tabs
- Prose wrapping enabled
- Import sorting (builtin → third-party → everything else)

### Linting (`lint`)

Powered by [oxlint](https://oxc.rs) via vite-plus, with type-aware checking enabled. Rules are
selected by filtering the full oxlint rule set against a curated combination of plugins and
categories:

| Preset             | Plugins                                                       | Categories                    |
| ------------------ | ------------------------------------------------------------- | ----------------------------- |
| `production_node`  | eslint, oxc, typescript, promise                              | correctness, perf, suspicious |
| `production_react` | eslint, oxc, typescript, promise, react, react-perf, jsx-a11y | correctness, perf, suspicious |
| `test`             | eslint, oxc, promise, vitest                                  | correctness                   |

File-level overrides apply automatically:

- `**/*.tsx` files use the `production_react` preset
- `*/*.test.*` files use the `test` preset
- Everything else uses `production_node`

Ignore patterns are read from your repository's `.gitignore` at config load time.

### Testing (`test`)

- Pass with no test files
- Unstub globals and env vars between tests
- Reset mocks between tests

### Pre-commit (`staged`)

All staged files are run through `vp check --fix` before each commit.

## Customization

### Extending the default config

Spread the defaults and override individual sections:

```ts
import { defineConfig } from "vite-plus";
import defaults from "@michaelhelvey/vite-config";

export default defineConfig({
  ...defaults,
  test: {
    ...defaults.test,
    passWithNoTests: false,
  },
});
```

### Using lint presets directly

You can import the rule and plugin helpers to build your own lint config:

```ts
import { rulesForCategory, pluginsForCategory } from "@michaelhelvey/vite-config";

// Get all rules for a preset as { "scope/rule-name": "error" }
const rules = rulesForCategory("production_react");

// Get the plugin list for a preset
const plugins = pluginsForCategory("test");
```

### Accessing the raw rule data

The full scraped oxlint rule table is available as a separate export:

```ts
import { RULES } from "@michaelhelvey/vite-config/rules";
```

Each entry includes `scope`, `value`, `category`, `type_aware`, `fix`, `default`, and `docs_url`.

## Updating rules

The rule table in `src/rules.ts` is auto-generated from the
[oxc rules page](https://oxc.rs/docs/guide/usage/linter/rules.html). To refresh it:

```sh
npm run build:generate   # runs scripts/scrape-rules.ts
```

## License

MIT
