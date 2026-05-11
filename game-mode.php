<?php
/**
 * Plugin Name: Game Mode
 * Description: Choose a difficulty level (Simple / Intermediate / Advanced) for the Site Editor experience.
 * Version: 0.1.0
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * Author: Anne McCarthy
 * Author URI: https://github.com/annezazu
 * Plugin URI: https://github.com/annezazu/game-mode
 * License: GPL-2.0-or-later
 * Text Domain: game-mode
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'GAME_MODE_VERSION', '0.1.0' );
define( 'GAME_MODE_PATH', plugin_dir_path( __FILE__ ) );
define( 'GAME_MODE_URL', plugin_dir_url( __FILE__ ) );

/**
 * Enqueue editor assets — Site Editor only.
 */
function game_mode_enqueue_assets() {
	global $pagenow;
	if ( 'site-editor.php' !== $pagenow ) {
		return;
	}

	$asset_file = GAME_MODE_PATH . 'build/index.asset.php';
	if ( ! file_exists( $asset_file ) ) {
		return;
	}
	$asset = include $asset_file;

	wp_enqueue_script(
		'game-mode-editor',
		GAME_MODE_URL . 'build/index.js',
		$asset['dependencies'],
		$asset['version'],
		true
	);

	wp_enqueue_style(
		'game-mode-editor',
		GAME_MODE_URL . 'build/style-index.css',
		array(),
		$asset['version']
	);

	wp_set_script_translations( 'game-mode-editor', 'game-mode' );

	$saved_level = get_user_meta( get_current_user_id(), 'game_mode_level', true );
	$initial     = in_array( $saved_level, array( 'easy', 'medium', 'hard' ), true ) ? $saved_level : null;
	wp_add_inline_script(
		'game-mode-editor',
		'window.gameModeInitial = ' . wp_json_encode( $initial ) . ';',
		'before'
	);
}
add_action( 'enqueue_block_editor_assets', 'game_mode_enqueue_assets' );

/**
 * Register `game_mode_level` as a per-user meta exposed to the REST API.
 *
 * This replaces a previous custom `game-mode/v1/level` REST endpoint. By
 * registering the meta with `show_in_rest`, the value is automatically
 * read/writeable via the canonical `/wp/v2/users/me` endpoint — no custom
 * REST route, no bespoke schema, no second auth surface to audit.
 *
 * The JS in `src/store.js` writes via `apiFetch( { path: '/wp/v2/users/me' } )`
 * with `{ meta: { game_mode_level: level } }`.
 */
function game_mode_register_user_meta() {
	register_meta(
		'user',
		'game_mode_level',
		array(
			'type'              => 'string',
			'single'            => true,
			'show_in_rest'      => array(
				'schema' => array(
					'type' => 'string',
					'enum' => array( '', 'easy', 'medium', 'hard' ),
				),
			),
			'auth_callback'     => function () {
				return current_user_can( 'edit_theme_options' );
			},
			'sanitize_callback' => function ( $value ) {
				return in_array( $value, array( 'easy', 'medium', 'hard' ), true ) ? $value : '';
			},
		)
	);
}
add_action( 'init', 'game_mode_register_user_meta' );

/**
 * Block-name prefixes treated as "theme blocks" — dynamic blocks that depend
 * on post / site / query context. Single source of truth: the previous JS
 * mirror in `src/filters/theme-blocks-inserter.js` has been removed in
 * favor of doing all theme-block hiding server-side via
 * `allowed_block_types_all`.
 *
 * Most of these are already redundant with the `category === 'theme'`
 * short-circuit in `game_mode_is_theme_block` for Core blocks, but listing
 * explicit prefixes also catches non-`theme`-categorized children (e.g.
 * `core/navigation-link`, `core/comment-author-name`, `core/post-content`).
 *
 * Wrapped in a function so theme authors / extenders can filter the list.
 */
function game_mode_theme_block_prefixes() {
	$prefixes = array(
		'core/post-',
		'core/site-',
		'core/template-part',
		'core/query',
		'core/comment',
		'core/comments',
		'core/navigation',
		'core/navigation-link',
		'core/navigation-submenu',
		'core/home-link',
		'core/page-list',
		'core/loginout',
		'core/avatar',
		'core/term-description',
		'core/archives',
		'core/categories',
		'core/calendar',
		'core/latest-posts',
		'core/latest-comments',
		'core/tag-cloud',
		'core/rss',
		'core/search',
		'core/read-more',
	);
	/**
	 * Filter the list of block-name prefixes that Game Mode treats as
	 * "theme blocks" and hides from the inserter in Simple level.
	 *
	 * @param string[] $prefixes Block-name prefixes (`core/post-`, etc.).
	 */
	return apply_filters( 'game_mode_theme_block_prefixes', $prefixes );
}

/**
 * Returns true when the given block name should be treated as a theme block.
 */
function game_mode_is_theme_block( $name, $category = '' ) {
	if ( 'theme' === $category ) {
		return true;
	}
	foreach ( game_mode_theme_block_prefixes() as $prefix ) {
		if ( $name === rtrim( $prefix, '-' ) || strpos( $name, $prefix ) === 0 ) {
			return true;
		}
	}
	return false;
}

/**
 * Restrict the inserter to non-theme blocks for users on Simple level.
 *
 * Hooks `allowed_block_types_all` — the canonical WP filter for
 * per-editor-context allowed-block lists. Enforced by core, so it covers
 * paste / slash-command / drag-drop in addition to the inserter sidebar.
 */
function game_mode_filter_allowed_block_types( $allowed, $editor_context ) {
	$user_id = get_current_user_id();
	if ( ! $user_id ) {
		return $allowed;
	}
	$level = get_user_meta( $user_id, 'game_mode_level', true );
	if ( 'easy' !== $level ) {
		return $allowed;
	}
	$registry = WP_Block_Type_Registry::get_instance()->get_all_registered();
	$names    = array();
	foreach ( $registry as $name => $type ) {
		$category = isset( $type->category ) ? $type->category : '';
		if ( ! game_mode_is_theme_block( $name, $category ) ) {
			$names[] = $name;
		}
	}
	return $names;
}
add_filter( 'allowed_block_types_all', 'game_mode_filter_allowed_block_types', 10, 2 );

/**
 * Per-level editor settings applied through `block_editor_settings_all`.
 *
 * These are server-side editor settings — things Core exposes only via
 * the settings filter, with no `core/preferences` UI toggle. Compare with
 * `prefs` / `editSitePrefs` in `src/levels.js`, which carry true user
 * preferences that the user can also flip from the editor UI.
 *
 * Keys here MUST be ones documented in the Curating the Editor Experience
 * guide or known to be honored by the editor:
 * https://developer.wordpress.org/block-editor/how-to-guides/curating-the-editor-experience/
 *
 * Returning `null` for a level means "no overrides — leave Core defaults
 * alone." Returning an array merges over Core's defaults.
 */
function game_mode_editor_settings_for_level( $level ) {
	$by_level = array(
		'easy'   => array(
			// Simple users edit content, not markup — hide the Code Editor.
			'codeEditingEnabled' => false,
		),
		'medium' => array(
			// Intermediate users compose pages, but rarely need raw block markup.
			'codeEditingEnabled'                    => false,
			// Match Advanced: don't lock template parts / unsynced patterns
			// into contentOnly mode just because they're at the root.
			'disableContentOnlyForUnsyncedPatterns' => true,
		),
		'hard'   => array(
			// Opt out of WP 7.0's contentOnly default for unsynced patterns
			// and template parts. Must be set server-side: Core applies the
			// default at block-editor mount, so any client-side opt-out via
			// `updateSettings` loses the race on a fresh load. (The previous
			// client-side `src/filters/hard-no-content-only.js` could only
			// react after the editor had already rendered with contentOnly
			// applied — the locks flashed off then back on as patterns
			// remounted. Server-side is the only race-free option.)
			'disableContentOnlyForUnsyncedPatterns' => true,
		),
	);
	return isset( $by_level[ $level ] ) ? $by_level[ $level ] : null;
}

/**
 * Expose the active level via the canonical `block_editor_settings_all`
 * filter so any block-editor context (post editor, site editor, or
 * future Gutenberg-powered editors) can read it through the standard
 * settings surface, instead of via the bespoke `window.gameModeInitial`
 * global script.
 *
 * Also merges in the per-level editor settings from
 * `game_mode_editor_settings_for_level()` (e.g. `codeEditingEnabled`,
 * `canLockBlocks`) — the canonical extension point for server-side
 * curation, per the Curating the Editor Experience guide.
 *
 * The legacy `wp_add_inline_script` path in `game_mode_enqueue_assets`
 * is kept for now — `getSettings()` resolves after editor mount, while
 * our JS bundle reads the level synchronously at module load. Eventually
 * we want to migrate to a single source of truth here.
 *
 * @param array $settings Editor settings.
 * @return array Filtered settings.
 */
function game_mode_filter_block_editor_settings( $settings ) {
	$user_id = get_current_user_id();
	if ( ! $user_id ) {
		return $settings;
	}
	$level = get_user_meta( $user_id, 'game_mode_level', true );
	if ( ! in_array( $level, array( 'easy', 'medium', 'hard' ), true ) ) {
		return $settings;
	}
	$settings['gameMode'] = array(
		'level' => $level,
	);
	$overrides = game_mode_editor_settings_for_level( $level );
	if ( is_array( $overrides ) ) {
		$settings = array_merge( $settings, $overrides );
	}
	return $settings;
}
add_filter( 'block_editor_settings_all', 'game_mode_filter_block_editor_settings' );
