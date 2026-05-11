/**
 * Simple mode: trim niche / escape-hatch formats from the RichText toolbar.
 *
 * The default RichText toolbar carries inline-image, keyboard, language,
 * subscript, and superscript — useful for technical or scientific content
 * but distracting for Simple's "quick edits" persona. Drop them so the
 * toolbar stays focused on bold / italic / link / strike / underline /
 * inline-code / text-color.
 *
 * Uses the documented `wp.richText.unregisterFormatType` API
 * (Curating the Editor Experience → Disable editor functionality).
 *
 * Note: `unregisterFormatType` requires the page to reload to re-register,
 * which fits game-mode's existing level-switch-reloads flow — switching
 * Simple → Intermediate / Advanced reloads the editor, and the formats
 * are re-registered from `@wordpress/format-library` on the fresh load.
 */

import { unregisterFormatType, getFormatType } from '@wordpress/rich-text';
import { subscribe } from '@wordpress/data';

const FORMATS_TO_DROP = [
	'core/image',
	'core/keyboard',
	'core/language',
	'core/subscript',
	'core/superscript',
];

let unsubscribe = null;

/**
 * Try to unregister every format in FORMATS_TO_DROP.
 * Returns the count of formats still pending registration.
 *
 * Defensive against throws: rich-text store may not be mounted yet at the
 * point this runs, and `getFormatType` can return undefined / throw if the
 * registry isn't initialized.
 */
function tryUnregisterAll() {
	let pending = 0;
	FORMATS_TO_DROP.forEach( ( name ) => {
		let registered = null;
		try {
			registered = getFormatType( name );
		} catch ( _e ) {
			// Registry not ready.
			pending += 1;
			return;
		}
		if ( ! registered ) {
			pending += 1;
			return;
		}
		try {
			unregisterFormatType( name );
		} catch ( _e ) {
			// Already unregistered or in a weird state — silent no-op.
		}
	} );
	return pending;
}

export function setupEasyToolbarCuration( level ) {
	if ( unsubscribe ) {
		try {
			unsubscribe();
		} catch ( _e ) {}
		unsubscribe = null;
	}
	if ( level !== 'easy' ) {
		// Non-Simple levels: we can't re-register formats we unregistered, but
		// level switches reload the page, so the next mount will see the full
		// set again.
		return;
	}
	let pending;
	try {
		pending = tryUnregisterAll();
	} catch ( _e ) {
		return;
	}
	if ( pending === 0 ) {
		return;
	}
	// Some formats not yet registered — subscribe and retry until they are.
	let attempts = 0;
	try {
		unsubscribe = subscribe( () => {
			try {
				if ( tryUnregisterAll() === 0 || ++attempts > 50 ) {
					unsubscribe?.();
					unsubscribe = null;
				}
			} catch ( _e ) {
				unsubscribe?.();
				unsubscribe = null;
			}
		} );
	} catch ( _e ) {
		// `subscribe` not available — give up silently.
	}
}
