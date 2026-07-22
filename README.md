# @michaelhelvey/vite-config

Opinionated defaults and configuration helpers for [VitePlus](https://viteplus.dev/).

## Getting Started

Install the package:

```shell
npm install -D @michaelhelvey/vite-config
```

_Or use the package manager of your choice_.

Then create your config file at `./vite.config.ts`:

```typescript
import { defineConfig } from "@michaelhelvey/vite-config";

export default await defineConfig();
```

While this is all you have to do to get (what I consider to be) reasonable defaults for linting,
formatting, and testing, out of the box, you can also pass in additional options to the
`defineConfig` function. These options will be deeply merged (using `lodash.merge`) into the base
configuration, so you don't have to worry about manually spreading defaults:

```typescript
import { defineConfig, FileTypes } from "@michaelhelvey/vite-config";

export default await defineConfig({
  lint: {
    overrides: [
      {
        files: FileTypes.JS_SOURCE,
        rules: {
          "no-console": "off",
        },
      },
    ],
  },
});
```

Note that while I encourage defining everything within `overrides` so as to save your own sanity
regarding what rules are enabled for what file types, you certainly don't have to do that if you
want the same rules enabled for everything. Use the
[oxlint config reference](https://oxc.rs/docs/guide/usage/linter/config.html) for more information.

## Helpers

There's a few different helpers defined by the package to help you build your own configuration
files.

- **FileTypes**: an enumeration of various patterns defining common groupings of files within modern
  Typescript projects.
- **RULES**: An exported, strongly-typed list of all oxlint rules. You can iterate over this in
  order to build up dynamic lists of rules in code rather than statically defining them. See
  `./src/index.ts` in this project to see what I mean.
- **ruleSelector**: A function that returns a dictionary of rules for a given set of `categories`
  and `sources` (where a category is something like "correctness" and a source is something like
  "eslint").
- Typescript types corresponding to many of the above, such as `Rule`, `RuleSource`, `RuleCategory`
  and `RuleName`.

You are encouraged to read the source of `./src/index.ts` within this repository for more details.

## Development

You can re-generate the rules by scraping the oxlint website by running `bun run build:generate`.

Publishing is only performed locally.

## License

MIT
