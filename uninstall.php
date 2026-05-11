<?php
/**
 * Game Mode — uninstall handler.
 *
 * Runs when the plugin is deleted via the WordPress admin (not on
 * deactivation). Cleans up the per-user `game_mode_level` user meta key
 * created by the plugin so deletion leaves no residue.
 *
 * @package Game_Mode
 */

// Bail if uninstall isn't being called by WordPress itself.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// Drop the user meta in one query rather than looping through every user —
// `delete_metadata( 'user', 0, $key, '', true )` deletes by key for all users.
delete_metadata( 'user', 0, 'game_mode_level', '', true );
