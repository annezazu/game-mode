# Game Mode

Choose a difficulty level for the WordPress Site Editor. Light locks layout and shows only the basics. Standard gives you balanced editing. Advanced unlocks every block-support control for full theme design.

A persistent switcher in the bottom-right of the editor lets you change levels at any time.

> Status: experimental. This plugin uses several `__experimental` and `__unstable` Gutenberg APIs and depends on DOM-text matching against editor labels. It may break with Gutenberg releases.

## What each level does

| | Light | Standard | Advanced |
|---|---|---|---|
| Patterns | content-only locked | content-only locked | unlocked |
| Block-support controls | color + font size only | core defaults | every control expanded by default |
| Distraction-free | minimal chrome (helpers off) | normal | normal |
| Theme blocks (Query Loop, Post Title, …) | hidden from inserter | available | available |
| Inserter tabs | Patterns only | all tabs | all tabs |
| Block-directory installs | disabled | disabled | enabled |
| Styles sidebar | Browse styles + Colors + Typography + Background only | full | full |
| Pattern editing UX | locked unless "Edit pattern" clicked | locked unless "Edit pattern" clicked | auto-unlocked |

## Install

This repo ships source only. To use the plugin you need to build it once, then drop the directory into `wp-content/plugins/`.

```bash
git clone https://github.com/annezazu/game-mode.git
cd game-mode
npm install
npm run build
```

Then either copy the directory into your WordPress install:

```bash
cp -R . /path/to/wordpress/wp-content/plugins/game-mode
```

…or symlink it:

```bash
ln -s "$(pwd)" /path/to/wordpress/wp-content/plugins/game-mode
```

Activate **Game Mode** in **Plugins → Installed Plugins** and open the Site Editor. The first time it runs you'll see a "Choose your difficulty" modal.

## Local development with `wp-env`

```bash
npm run start          # webpack watch
npx wp-env start       # boots a local WP at http://localhost:8898
npx wp-env run cli wp core version
```

The bundled `.wp-env.json` pins WordPress to a recent release and mounts this directory as a plugin via a no-space symlink at `/tmp/game-mode-link/game-mode` (wp-env tokenizes plugin paths on whitespace).

## Tests

```bash
npm test
```

Jest unit tests cover the pure block-support helpers (`minimizeSupports`, `expandDefaultControls`) and the theme-block matcher.

## Architecture

- **PHP** (`game-mode.php`): bootstrap, asset enqueue gated to `site-editor.php`, registered user meta (`game_mode_level`) exposed through the canonical `/wp/v2/users/me` endpoint, and an `allowed_block_types_all` filter that hides theme blocks from the inserter when the user is on Simple level. Pattern content-only locking is now done at runtime in JS (`src/filters/pattern-content-only.js`) — no more server-side mutation of registered pattern content.
- **JS bundle** (`src/`): React UI for the picker modal + bottom-right switcher (`@wordpress/components`), level configuration (`levels.js`), and a stack of `MutationObserver`/`subscribe()`-driven filters in `src/filters/` that hide-or-modify parts of the editor based on the active level.

## License

GPL-2.0-or-later.
