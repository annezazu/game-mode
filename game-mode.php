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
