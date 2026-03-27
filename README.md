# @michaelhelvey/vite-config

Opinionated defaults for [Vite+](https://viteplus.dev/).

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
