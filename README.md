# Game Mode

Choose a difficulty level for the WordPress Site Editor. **Simple** locks layout and shows only the basics. **Intermediate** gives you balanced editing. **Advanced** unlocks every block-support control for full theme design.

A persistent switcher in the bottom-right of the editor lets you change levels at any time.

> Status: experimental. This plugin uses several `__experimental` and `__unstable` Gutenberg APIs and depends on DOM-text matching against editor labels. It may break with Gutenberg releases.

## What each level does

| | Simple | Intermediate | Advanced |
|---|---|---|---|
| Patterns | content-only locked | content-only locked | unlocked |
| Block-support controls | color + font size only | core defaults | every control expanded by default |
| Focus mode (`focusMode` core preference) | on | off | off |
| Distraction-free | minimal chrome (helpers off) | normal | normal |
| Theme blocks (Query Loop, Post Title, …) | hidden from inserter | available | available |
| Inserter tabs | Patterns only | all tabs | all tabs |
| Choose-pattern modal on new pages (`enableChoosePatternModal`) | enabled | enabled | disabled |
| Block-directory installs | disabled | disabled | enabled |
| Styles sidebar | Browse styles + Colors + Typography + Background only | full | full |
| Pattern editing UX | locked unless "Edit pattern" clicked | locked unless "Edit pattern" clicked | auto-unlocked |
| Lock-removal on root blocks | locked (Backspace can't wipe a section) | unlocked | unlocked |

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

Jest unit tests cover the pure block-support helpers (`minimizeSupports`, `expandDefaultControls`).

## Architecture

- **PHP** (`game-mode.php`): bootstrap, asset enqueue gated to `site-editor.php`, registered user meta (`game_mode_level`) exposed through the canonical `/wp/v2/users/me` endpoint, and an `allowed_block_types_all` filter that hides theme blocks from the inserter when the user is on Simple level (the single source of truth for the theme-block list). Pattern content-only locking is now handled by WP 7.0 Core; the Advanced opt-out is set via `disableContentOnlyForUnsyncedPatterns` in `block_editor_settings_all`.
- **JS bundle** (`src/`): React UI for the picker modal + bottom-right switcher (`@wordpress/components`), level configuration (`levels.js`), and a stack of `MutationObserver`/`subscribe()`-driven filters in `src/filters/` that hide-or-modify parts of the editor based on the active level.

## Stability — experimental Gutenberg APIs in use

This plugin reaches into a number of `__experimental*` and `__unstable*` APIs from the Gutenberg packages. Those carry no compatibility guarantee — they can be renamed or removed in any release without a deprecation cycle. The list below is the surface area to watch when bumping `@wordpress/*` deps:

| API | File | What breaks if it goes away |
|---|---|---|
| `__experimentalGetDirtyEntityRecords` (`core` store) | `src/index.js` | Unsaved-changes guard before reload — falls back to no warning |
| `__experimentalConfirmDialog` (`@wordpress/components`) | `src/index.js` | The "Save before switching?" dialog stops rendering |
| `__unstableMotion` / `__unstableAnimatePresence` (`@wordpress/components`) | `src/components/LevelSwitcher.jsx` | Switcher icon swap goes from animated → instant |
| `__unstableMarkNextChangeAsNotPersistent` (`core/block-editor` dispatch) | `src/filters/easy-lock-remove.js` | Lock-remove writes get marked as user edits, dirtying the post |
| `__experimentalGetAllowedPatterns` (`core/block-editor` selector) | n/a directly today, but used by patterns observer | Pattern list filtering can no-op |
| `setBlockEditingMode` / `getBlockEditingMode` / `unsetBlockEditingMode` | `src/filters/hard-no-content-only.js` | Pattern auto-unlock in Advanced stops working |
| `__experimentalText` / `__experimentalHeading` / `__experimentalVStack` / `__experimentalHStack` (`@wordpress/components`) | `LevelCard`, `LevelPickerModal` | Build error — these are not optional, swap with stable `Text`/`Heading`/`Flex` if removed |

In addition, several filters depend on **DOM-text matching against editor labels** (e.g. matching panel headers by their visible "Layout" / "Edit pattern" text). Those break in non-English locales and on label changes:

- `src/filters/easy-block-inspector.js` — "Edit pattern", "Styles", "Layout", "Dimensions", "Border", "Position", "Shadow", "Background", "Advanced"
- `src/filters/easy-styles-menu.js` — "Browse styles", "Colors", "Typography", "Background", + the "customize the appearance of specific blocks" description
- `src/filters/hard-no-content-only.js` — "Edit pattern"
- `src/filters/easy-patterns-only-inserter.js` — "Patterns"

Also worth noting: `showSimpleTopbar` and `showBlockHelpers` in `src/levels.js` mirror an unmerged Gutenberg PR ([#74546](https://github.com/WordPress/gutenberg/pull/74546)). On stock WordPress they are no-ops; the visual effect is provided by the CSS in `src/filters/distraction-free-config.js`.

## License

GPL-2.0-or-later.
