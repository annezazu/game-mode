/**
 * Simple mode: trim the Global Styles sidebar root menu to a curated allow-list.
 *
 * The Site Editor's Styles screen renders a list of navigator items
 * (Typography, Colors, Layout, Shadows, Blocks, Background, …). For Simple
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

import { getObserverTarget } from './observer-target';

const ALLOWED = [
	'browse styles',
	'colors',
	'typography',
	'background',
];

/**
 * Explicit block-list of root-menu rows we never want to show in Simple mode.
 * Belt-and-braces alongside the allow-list — newer Gutenberg builds keep
 * adding entries (Shadows, Layout, Blocks, …) and we'd rather hide a known
 * bad row by exact label than rely solely on allow-list misses.
 */
const BLOCKED_LABELS = [
	'shadows',
	'layout',
	'blocks',
	'css',
	'revisions',
];

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

function normalize( s ) {
	return ( s || '' ).replace( /\s+/g, ' ' ).trim().toLowerCase();
}

function isAllowed( label ) {
	if ( ! label ) {
		return false;
	}
	return ALLOWED.some( ( allowed ) => label.startsWith( allowed ) );
}

function isBlocked( label ) {
	if ( ! label ) {
		return false;
	}
	return BLOCKED_LABELS.some(
		( blocked ) => label === blocked || label.startsWith( blocked + ' ' )
	);
}

/**
 * Resolve an item's accessible label. Prefers aria-label / aria-labelledby,
 * falls back to its own visible text. Critically does NOT walk up to a
 * shared row — that would pick up sibling labels and incorrectly mark
 * everything "allowed".
 */
function getLabel( el ) {
	const aria = el.getAttribute && el.getAttribute( 'aria-label' );
	if ( aria ) {
		return normalize( aria );
	}
	const labelledBy =
		el.getAttribute && el.getAttribute( 'aria-labelledby' );
	if ( labelledBy ) {
		const ref = document.getElementById( labelledBy );
		if ( ref ) {
			return normalize( ref.textContent );
		}
	}
	return normalize( el.textContent );
}

/**
 * Find the styles sidebar root. Tried selectors mirror the various class
 * names Gutenberg has used across recent releases.
 */
function findStylesSidebars() {
	return document.querySelectorAll(
		[
			// WP 7.0+
			'.editor-global-styles-sidebar',
			// WP 6.x
			'.edit-site-global-styles-sidebar',
			'.edit-site-global-styles-screen-root',
			'.edit-site-sidebar-edit-mode__panel',
			'.edit-site-sidebar__panel-content',
		].join( ',' )
	);
}

function findRootScreens() {
	return document.querySelectorAll(
		[
			// WP 7.0+
			'.global-styles-ui-screen-root',
			// WP 6.x
			'.edit-site-global-styles-screen-root',
		].join( ',' )
	);
}

/**
 * Stable Navigator.Button IDs assigned by core for the root menu items in
 * WP 7.0+. Matching by ID is more robust than matching by visible text
 * (which is localized) and survives small markup tweaks.
 */
const ALLOWED_IDS = new Set( [
	'/variations', // "Browse styles"
	'/typography',
	'/colors',
	'/background',
] );
const BLOCKED_IDS = new Set( [
	'/shadows',
	'/layout',
	'/blocks',
	'/css',
	'/revisions',
] );

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
	// Row-based hiding only on the root styles screen. The wrapping class is
	// unique to the root — detail screens (Typography, Colors, etc.) carry
	// their own classes. Hiding rows on detail screens would strip their
	// inner controls.
	const rootScreens = findRootScreens();
	rootScreens.forEach( ( screen ) => {
		// Operate on leaf interactive nav items rather than wrapping rows.
		// Reading text from a wrapper that contains every nav item makes
		// every label look like a giant concatenated string and `startsWith`
		// against the allow-list trivially matches "browse styles…",
		// leaving nothing hidden. Individual buttons/links each carry their
		// own label.
		const items = screen.querySelectorAll(
			'button, a[href], [role="button"]'
		);
		items.forEach( ( item ) => {
			const row = findRow( item );
			if ( ! row || row.dataset.gameModeHidden === 'true' ) {
				return;
			}
			const id = item.getAttribute && item.getAttribute( 'id' );
			let allowed;
			if ( id && ( ALLOWED_IDS.has( id ) || BLOCKED_IDS.has( id ) ) ) {
				// Prefer stable Navigator.Button IDs (WP 7.0+) over labels.
				allowed = ALLOWED_IDS.has( id );
			} else {
				const label = getLabel( item );
				if ( ! label ) {
					return;
				}
				allowed = isAllowed( label ) && ! isBlocked( label );
			}
			if ( ! allowed ) {
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
						el.closest( '.components-card__body' ) ||
						el.closest( '.components-h-stack' ) ||
						el.parentElement ||
						el;
					container.style.display = 'none';
					container.dataset.gameModeHidden = 'true';
					// Also hide the preceding <hr> divider when present —
					// otherwise we leave a stray separator above an empty
					// region.
					const prev = container.previousElementSibling;
					if (
						prev &&
						( prev.tagName === 'HR' ||
							prev.classList.contains(
								'components-card__divider'
							) )
					) {
						prev.style.display = 'none';
					}
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
	const target = getObserverTarget();
	if ( target ) {
		observer.observe( target, { childList: true, subtree: true } );
	}
	// Run once in case the styles sidebar is already mounted.
	processStylesScreen();
}
