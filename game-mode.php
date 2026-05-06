<?php
/**
 * Plugin Name: Game Mode
 * Description: Choose a difficulty level (Light / Standard / Advanced) for the Site Editor experience.
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
 * Wrap registered patterns in a contentOnly Group block. Easy + Medium modes
 * read a per-user preference and apply this server-side so the lock travels
 * with every pattern insertion.
 *
 * The actual gating per level is performed client-side; we always provide a
 * "locked variant" of the pattern content under a known marker, and the JS
 * filter chooses which to insert. To keep parsing fast, we only wrap at
 * registration time when a user-meta flag is set.
 */
function game_mode_filter_pattern_args( $pattern_properties, $pattern_name ) {
	$user_id = get_current_user_id();
	if ( ! $user_id ) {
		return $pattern_properties;
	}
	$level = get_user_meta( $user_id, 'game_mode_level', true );
	if ( 'easy' !== $level && 'medium' !== $level ) {
		return $pattern_properties;
	}
	if ( empty( $pattern_properties['content'] ) ) {
		return $pattern_properties;
	}
	$wrapped =
		'<!-- wp:group {"templateLock":"contentOnly","layout":{"type":"constrained"}} -->' .
		'<div class="wp-block-group">' . $pattern_properties['content'] . '</div>' .
		'<!-- /wp:group -->';
	$pattern_properties['content'] = $wrapped;
	return $pattern_properties;
}
add_filter( 'register_block_pattern_args', 'game_mode_filter_pattern_args', 10, 2 );

/**
 * REST endpoint to mirror the level into user meta so server-side filters
 * (like the pattern wrapper above) see the same value as the JS preferences
 * store.
 */
function game_mode_register_rest() {
	register_rest_route(
		'game-mode/v1',
		'/level',
		array(
			'methods'             => 'POST',
			'permission_callback' => function () {
				return current_user_can( 'edit_theme_options' );
			},
			'args'                => array(
				'level' => array(
					'type'     => 'string',
					'enum'     => array( 'easy', 'medium', 'hard' ),
					'required' => true,
				),
			),
			'callback'            => function ( $request ) {
				update_user_meta( get_current_user_id(), 'game_mode_level', $request['level'] );
				return array( 'level' => $request['level'] );
			},
		)
	);
}
add_action( 'rest_api_init', 'game_mode_register_rest' );

/**
 * Block-name prefixes treated as "theme blocks" — dynamic blocks that depend
 * on post / site / query context. Kept in sync with the JS list in
 * `src/filters/theme-blocks-inserter.js`.
 *
 * Wrapped in a function so theme authors / extenders can filter the list.
 */
function game_mode_theme_block_prefixes() {
	$prefixes = array(
		'core/post-',
		'core/template-part',
		'core/query',
		'core/comment',
		'core/comments',
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
 *
 * Belt-and-braces with the JS `blocks.registerBlockType` filter in
 * `src/filters/theme-blocks-inserter.js`, which sets `supports.inserter`
 * false for the same set so the block also disappears from any future
 * inserter UI that doesn't consult `allowed_block_types_all`.
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
