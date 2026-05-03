# Contributing

Thanks for poking around. This is an experimental plugin shipped from a Claude-assisted prototype, so expect some rough edges and a heavier reliance on private/experimental Gutenberg APIs than you'd want in production.

## Setup

```bash
npm install
npm run build      # produces build/index.js + build/index.asset.php
npm run start      # watch-mode build during development
```

`build/` is gitignored. The plugin won't run without it — always build before installing.

## Running locally

```bash
npx wp-env start
# http://localhost:8898 — admin / password
```

## Tests, lint, format

```bash
npm test
npm run lint:js
npm run format
```

## Brittleness, in plain language

A few things to know before you change code:

- Several filters use **DOM text matching** (e.g. matching panel headers by their visible label "Layout" / "Edit pattern"). These break in non-English locales and on Gutenberg label changes. Search the codebase for `// TODO` to find them.
- We rely on **`__experimental*` and `__unstable*` APIs** from `@wordpress/components` and `@wordpress/block-editor`. These can be removed without deprecation. The list lives in the README.
- The `showSimpleTopbar` and `showBlockHelpers` preferences mirror an **unmerged Gutenberg PR** ([#74546](https://github.com/WordPress/gutenberg/pull/74546)). On stock WordPress they're no-ops.
- **Switching levels triggers a page reload** (block-registration filters only run once at boot). The save-prompt dialog catches unsaved edits before reloading.

## Filing issues

Useful info to include:
- WordPress core version, Gutenberg plugin version (if installed), browser
- The active level when the bug occurred
- Console errors / network errors if any
- Repro steps from the Site Editor home

## License

GPL-2.0-or-later — same as WordPress core.
