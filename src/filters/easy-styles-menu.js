/**
 * Easy mode: trim the Global Styles sidebar root menu to a curated allow-list.
 *
 * The Site Editor's Styles screen renders a list of navigator items
 * (Typography, Colors, Layout, Shadows, Blocks, Background, …). For Easy
 * mode we only want a small subset:
 *
 *   - Browse styles
 *   - Colors
 *   - Typography
 *   - Background
 *
 * Implemented as a MutationObserver because the global styles UI mounts and
 * unmounts as the user opens/closes the styles sidebar. Matching is by
 * visible text content with a normalized lowercase compare, which is
 * resilient to internal class renames.
 */

const ALLOWED = new Set( [
	'browse styles',
	'colors',
	'typography',
	'background',
] );

/**
 * Phrases that, if found anywhere in the styles sidebar, should hide their
 * containing block. Covers section descriptions / labels that aren't tied
 * to a navigator button (so the row-walker can't reach them via the
 * allow-list path).
 */
const BLOCKED_PHRASES = [
	'customize the appearance of specific blocks',
];

let observer = null;

function isAllowed( label ) {
	if ( ! label ) {
		return false;
	}
	for ( const allowed of ALLOWED ) {
		if ( label.startsWith( allowed ) ) {
			return true;
		}
	}
	return false;
}

/**
 * Find the styles sidebar root. Tried selectors mirror the various class
 * names Gutenberg has used across recent releases.
 */
function findStylesSidebars() {
	return document.querySelectorAll(
		[
			'.edit-site-global-styles-sidebar',
			'.edit-site-global-styles-screen-root',
			'.edit-site-sidebar-edit-mode__panel',
			'.edit-site-sidebar__panel-content',
		].join( ',' )
	);
}

/**
 * Walk up from a target element to the wrapping list-item / navigator-row.
 * Inside the global styles screen each entry typically wraps in either an
 * `<li>` (ItemGroup) or an HStack — we hide whichever matches first.
 */
function findRow( el ) {
	return (
		el.closest( 'li' ) ||
		el.closest( '.components-item' ) ||
		el.closest( '[role="listitem"]' ) ||
		el.closest( 'div[role="button"]' ) ||
		el.parentElement ||
		el
	);
}

/**
 * Returns true when this element is the root menu of the Global Styles
 * sidebar (the list of categories) rather than a nested detail screen.
 * Detail screens always include a back-button at the top.
 */
function isRootScreen( container ) {
	const back = container.querySelector(
		'button[aria-label="Back"], button[aria-label*="Back" i]'
	);
	// Detail screens have a Back button. The root screen does not.
	return ! back;
}

function processStylesScreen() {
	// Row-based hiding only on the root styles screen. The class is
	// `.edit-site-global-styles-screen-root` and is unique to the root —
	// detail screens (Typography, Colors, etc.) carry their own classes
	// like `.edit-site-global-styles-screen-typography`. Hiding rows on
	// detail screens would strip their inner controls.
	const rootScreens = document.querySelectorAll(
		'.edit-site-global-styles-screen-root'
	);
	rootScreens.forEach( ( screen ) => {
		const candidates = screen.querySelectorAll(
			'a, button, li, .components-item, [role="listitem"], div[role="button"]'
		);
		candidates.forEach( ( el ) => {
			const row = findRow( el );
			if ( ! row || row.dataset.gameModeHidden === 'true' ) {
				return;
			}
			const label = ( row.textContent || '' ).trim().toLowerCase();
			if ( ! label ) {
				return;
			}
			if ( ! isAllowed( label ) ) {
				row.style.display = 'none';
				row.dataset.gameModeHidden = 'true';
			}
		} );
	} );

	// Phrase-based hiding can still run across the whole styles sidebar.
	// Detail screens won't contain our blocked phrases, so this is safe.
	const sidebars = findStylesSidebars();
	sidebars.forEach( ( sidebar ) => {
		const textCandidates = sidebar.querySelectorAll(
			'p, span, .components-text, .components-truncate, h2, h3'
		);
		textCandidates.forEach( ( el ) => {
			if ( el.dataset.gameModeHidden === 'true' ) {
				return;
			}
			const text = ( el.textContent || '' ).trim().toLowerCase();
			if ( ! text ) {
				return;
			}
			for ( const phrase of BLOCKED_PHRASES ) {
				if ( text.includes( phrase ) ) {
					const container =
						el.closest( 'section' ) ||
						el.closest( '.components-panel__body' ) ||
						el.closest( '.components-h-stack' ) ||
						el.parentElement ||
						el;
					container.style.display = 'none';
					container.dataset.gameModeHidden = 'true';
					break;
				}
			}
		} );
	} );
}

export function setupEasyStylesMenu( level ) {
	if ( observer ) {
		observer.disconnect();
		observer = null;
	}
	if ( level !== 'easy' || typeof document === 'undefined' ) {
		return;
	}
	observer = new MutationObserver( () => {
		processStylesScreen();
	} );
	observer.observe( document.body, { childList: true, subtree: true } );
	// Run once in case the styles sidebar is already mounted.
	processStylesScreen();
}
