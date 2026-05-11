/**
 * Open the document list view by default for levels that benefit from it.
 *
 * - Simple: list view doubles as a structure overview for users who are
 *   just editing content within an existing layout.
 * - Advanced: designers expect every tool open and reachable.
 *
 * `showListView` (in the level's `prefs`) governs the *preference* — it
 * decides whether the toggle is visible / on by default. To actually open
 * the list view panel on editor mount we dispatch `setIsListViewOpened`
 * on the relevant store.
 *
 * The action moved between stores across recent WordPress releases
 * (`core/edit-post` → `core/edit-site` → `core/editor`), so we dispatch
 * defensively on each one we know about and ignore stores that don't
 * expose it.
 */

import { dispatch } from '@wordpress/data';

const STORES_WITH_LIST_VIEW = [
	'core/editor',
	'core/edit-site',
	'core/edit-post',
];

const LEVELS_WITH_AUTO_LIST_VIEW = [ 'easy', 'hard' ];

let opened = false;

function openListView() {
	if ( opened ) {
		return;
	}
	for ( const storeKey of STORES_WITH_LIST_VIEW ) {
		try {
			const actions = dispatch( storeKey );
			if ( actions?.setIsListViewOpened ) {
				actions.setIsListViewOpened( true );
				opened = true;
				return;
			}
		} catch ( e ) {
			// Store unavailable on this WP version — keep trying.
		}
	}
}

export function setupAutoListView( level ) {
	opened = false;
	if ( ! LEVELS_WITH_AUTO_LIST_VIEW.includes( level ) ) {
		return;
	}
	openListView();
}
