/**
 * Open the document list view by default on editor mount.
 *
 * User feedback consistently shows List View helps people get a sense of
 * the structure of their site, so we open it automatically across every
 * level. `showListView` (in each level's `prefs`) governs the *preference*
 * — it decides whether the toggle is visible / on by default. To actually
 * open the list view panel we dispatch `setIsListViewOpened` on the
 * relevant store.
 *
 * The action moved between stores across recent WordPress releases
 * (`core/edit-post` → `core/edit-site` → `core/editor`), so we dispatch
 * defensively on each one we know about and ignore stores that don't
 * expose it.
 */

import { dispatch, select, subscribe } from '@wordpress/data';

const STORES_WITH_LIST_VIEW = [
	'core/editor',
	'core/edit-site',
	'core/edit-post',
];

let opened = false;
// Set to true once we observe the user closing the list view after we
// opened it. Persists for the page lifetime (resets on reload, NOT on
// level switch) so a subsequent level switch respects the user's choice.
let userClosed = false;
let unsubscribe = null;

function findActiveStore() {
	for ( const storeKey of STORES_WITH_LIST_VIEW ) {
		try {
			const actions = dispatch( storeKey );
			if ( actions?.setIsListViewOpened ) {
				return storeKey;
			}
		} catch ( e ) {
			// Store unavailable on this WP version — keep trying.
		}
	}
	return null;
}

function watchForUserClose( storeKey ) {
	if ( unsubscribe ) {
		return;
	}
	unsubscribe = subscribe( () => {
		// Use whichever selector matches the store we wrote through.
		const isOpen = select( storeKey )?.isListViewOpened?.();
		if ( opened && isOpen === false ) {
			userClosed = true;
		}
	}, storeKey );
}

function openListView() {
	if ( opened || userClosed ) {
		return;
	}
	const storeKey = findActiveStore();
	if ( ! storeKey ) {
		return;
	}
	dispatch( storeKey ).setIsListViewOpened( true );
	opened = true;
	watchForUserClose( storeKey );
}

export function setupAutoListView( level ) {
	// `opened` resets per level switch so the open path can fire once after
	// each level transition. `userClosed` does NOT reset — once the user
	// has explicitly closed list view in this session, we stop forcing it
	// back open.
	opened = false;
	if ( ! level ) {
		return;
	}
	openListView();
}
