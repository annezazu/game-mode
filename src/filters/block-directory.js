/**
 * Disable the @wordpress/block-directory plugin in Simple and Intermediate modes.
 *
 * `@wordpress/block-directory` registers itself as a plugin called
 * `'block-directory'`. Unregistering it prevents the "Available to install"
 * results from appearing in the inserter when the user searches.
 *
 * The block-directory plugin script may load *after* ours, so we attempt
 * the unregister immediately and also subscribe to plugin registrations
 * until it succeeds (capped to a few attempts).
 */

import { unregisterPlugin, getPlugin } from '@wordpress/plugins';
import { subscribe } from '@wordpress/data';

const PLUGIN_NAME = 'block-directory';

let unsubscribe = null;

function tryUnregister() {
	if ( ! getPlugin( PLUGIN_NAME ) ) {
		return false;
	}
	try {
		unregisterPlugin( PLUGIN_NAME );
		return true;
	} catch ( e ) {
		return false;
	}
}

export function setupBlockDirectoryControl( level ) {
	if ( unsubscribe ) {
		unsubscribe();
		unsubscribe = null;
	}
	if ( level === 'hard' ) {
		// Keep block-directory enabled. We can't re-register a plugin we
		// previously unregistered (it requires page reload), but a level
		// switch already triggers a reload, so this is fine.
		return;
	}
	if ( tryUnregister() ) {
		return;
	}
	// Plugin not yet registered — watch for it.
	let attempts = 0;
	unsubscribe = subscribe( () => {
		if ( tryUnregister() || ++attempts > 50 ) {
			unsubscribe?.();
			unsubscribe = null;
		}
	} );
}
