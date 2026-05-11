/**
 * Simple mode: trim niche / escape-hatch formats from the RichText toolbar.
 *
 * The default RichText toolbar carries inline-image, keyboard, language,
 * subscript, superscript, math, and footnote — useful for technical,
 * scientific, or academic content but distracting for Simple's "quick
 * edits" persona. Drop them so the toolbar stays focused on bold /
 * italic / link / underline / strike / inline-code / text-color.
 *
 * Uses the documented `wp.richText.unregisterFormatType` API
 * (Curating the Editor Experience → Disable editor functionality).
 *
 * Note: `unregisterFormatType` requires the page to reload to re-register,
 * which fits game-mode's existing level-switch-reloads flow — switching
 * Simple → Intermediate / Advanced reloads the editor, and the formats
 * are re-registered from `@wordpress/format-library` on the fresh load.
 */

import { unregisterFormatType } from '@wordpress/rich-text';
import { select, subscribe } from '@wordpress/data';

const RICH_TEXT_STORE = 'core/rich-text';

const FORMATS_TO_DROP = [
	'core/image',
	'core/keyboard',
	'core/language',
	'core/subscript',
	'core/superscript',
	'core/math',
	'core/footnote',
];

let unsubscribe = null;

/**
 * Try to unregister every format in FORMATS_TO_DROP that is currently
 * registered. Returns the count still pending registration.
 *
 * Queries the `core/rich-text` store directly (the top-level
 * `@wordpress/rich-text` package doesn't export `getFormatType` — only the
 * store does).
 */
function tryUnregisterAll() {
	let pending = 0;
	let registry;
	try {
		registry = select( RICH_TEXT_STORE );
	} catch ( _e ) {
		return FORMATS_TO_DROP.length;
	}
	if ( ! registry || typeof registry.getFormatType !== 'function' ) {
		return FORMATS_TO_DROP.length;
	}
	FORMATS_TO_DROP.forEach( ( name ) => {
		if ( ! registry.getFormatType( name ) ) {
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
