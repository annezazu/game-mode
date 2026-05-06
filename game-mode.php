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
