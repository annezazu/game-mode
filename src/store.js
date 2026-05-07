/**
 * Light wrapper over core/preferences for the `game-mode` scope.
 */

import {
	useSelect,
	useDispatch,
	dispatch as globalDispatch,
} from '@wordpress/data';
import { store as preferencesStore } from '@wordpress/preferences';
import { store as noticesStore } from '@wordpress/notices';
import { useCallback } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';

import { LEVELS, LEVEL_KEYS } from './levels';

const SCOPE = 'game-mode';
const KEY = 'level';
const GEOMETRY_KEY = 'switcherGeometry';

/**
 * Read the current level from preferences. Returns null if unset.
 */
export function useLevel() {
	return useSelect( ( select ) => {
		const value = select( preferencesStore ).get( SCOPE, KEY );
		return LEVEL_KEYS.includes( value ) ? value : null;
	}, [] );
}

/**
 * Apply core preferences for a given level.
 */
function applyCorePrefsFor( level, dispatch ) {
	const config = LEVELS[ level ];
	if ( ! config ) {
		return;
	}
	const { set } = dispatch( preferencesStore );
	Object.entries( config.prefs ).forEach( ( [ name, value ] ) => {
		set( 'core', name, value );
	} );
}

/**
 * Hook returning a setter that persists the level to preferences, mirrors it
 * to user meta (for server-side filters), and applies the core preference
 * bundle for that level.
 *
 * `options.reload` triggers a soft reload after persistence — required when
 * the level change affects block registration filters.
 */
export function useSetLevel() {
	const { set } = useDispatch( preferencesStore );
	const dispatch = useDispatch();
	return useCallback(
		async ( level, { reload = false } = {} ) => {
			if ( ! LEVEL_KEYS.includes( level ) ) {
				return;
			}
			set( SCOPE, KEY, level );
			applyCorePrefsFor( level, dispatch );
			try {
				await apiFetch( {
					path: '/game-mode/v1/level',
					method: 'POST',
					data: { level },
				} );
			} catch ( e ) {
				// REST failed — client and server are now out of sync. The
				// PHP pattern wrapper reads user meta, so newly inserted
				// patterns may use the wrong lock until the user reloads.
				// Surface a snackbar so the failure isn't silent.
				if ( typeof console !== 'undefined' ) {
					// eslint-disable-next-line no-console
					console.warn(
						'[game-mode] failed to mirror level to user meta:',
						e
					);
				}
				try {
					globalDispatch( noticesStore ).createWarningNotice(
						__(
							'Couldn’t save your level to the server. Reload the editor if pattern locks look wrong.',
							'game-mode'
						),
						{ type: 'snackbar' }
					);
				} catch ( _e ) {
					// Notices store unavailable — nothing more we can do.
				}
			}
			if ( reload ) {
				window.location.reload();
			}
		},
		[ set, dispatch ]
	);
}

/**
 * Read the persisted Kilim geometry tuple for the floating switcher.
 * Returns null if unset or malformed.
 */
export function useSwitcherGeometry() {
	return useSelect( ( select ) => {
		const value = select( preferencesStore ).get( SCOPE, GEOMETRY_KEY );
		return Array.isArray( value ) && value.length === 5 ? value : null;
	}, [] );
}

/**
 * Hook returning a setter that persists the switcher geometry tuple.
 */
export function useSetSwitcherGeometry() {
	const { set } = useDispatch( preferencesStore );
	return useCallback(
		( geometry ) => {
			set( SCOPE, GEOMETRY_KEY, geometry );
		},
		[ set ]
	);
}

export { SCOPE, KEY, GEOMETRY_KEY };
