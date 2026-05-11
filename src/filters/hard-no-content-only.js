/**
 * Advanced mode: opt out of WP 7.0's pattern-editing default.
 *
 * As of WP 7.0, unsynced patterns and template parts inserted into the
 * editor default to `contentOnly` editing mode (see
 * https://github.com/WordPress/gutenberg/issues/73775). Core exposes a
 * single boolean — `disableContentOnlyForUnsyncedPatterns` — to opt out
 * of that behavior, which is what Advanced mode wants.
 *
 * We flip the setting via `updateSettings` instead of the PHP
 * `block_editor_settings_all` filter so a level switch takes effect
 * without a server round-trip. The setting is re-applied (or restored)
 * on every level change.
 */

import { dispatch, select } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';

const SETTING_KEY = 'disableContentOnlyForUnsyncedPatterns';

export function setupHardNoContentOnly( level ) {
	const blockEditor = dispatch( blockEditorStore );
	if ( ! blockEditor?.updateSettings ) {
		return;
	}
	const desired = level === 'hard';
	const current = !! select( blockEditorStore ).getSettings?.()?.[ SETTING_KEY ];
	if ( current === desired ) {
		return;
	}
	blockEditor.updateSettings( { [ SETTING_KEY ]: desired } );
}
