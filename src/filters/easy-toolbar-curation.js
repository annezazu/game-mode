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
 */
function tryUnregisterAll() {
	let pending = 0;
	FORMATS_TO_DROP.forEach( ( name ) => {
		if ( ! getFormatType( name ) ) {
			pending += 1;
			return;
		}
		try {
			unregisterFormatType( name );
		} catch ( e ) {
			// Already unregistered or never registered — silent no-op.
		}
	} );
	return pending;
}

export function setupEasyToolbarCuration( level ) {
	if ( unsubscribe ) {
		unsubscribe();
		unsubscribe = null;
	}
	if ( level !== 'easy' ) {
		// Non-Simple levels: we can't re-register formats we unregistered, but
		// level switches reload the page, so the next mount will see the full
		// set again.
		return;
	}
	if ( tryUnregisterAll() === 0 ) {
		return;
	}
	// Some formats not yet registered — subscribe and retry until they are.
	let attempts = 0;
	unsubscribe = subscribe( () => {
		if ( tryUnregisterAll() === 0 || ++attempts > 50 ) {
			unsubscribe?.();
			unsubscribe = null;
		}
	} );
}
