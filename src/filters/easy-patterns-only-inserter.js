/**
 * Simple mode: when the inserter opens, hide every tab except Patterns and
 * auto-select Patterns. Implemented as a one-shot MutationObserver so we
 * react to the inserter mounting without polling.
 *
 * The Patterns tab label is matched by text content rather than a stable
 * `data-tab-id`, so this is resilient to ID renames between Gutenberg
 * releases as long as the label stays "Patterns".
 */

let observer = null;

const PROCESSED_ATTR = 'data-game-mode-processed';

function processInserter( root ) {
	const tablist = root.querySelector( '[role="tablist"]' );
	if ( ! tablist || tablist.hasAttribute( PROCESSED_ATTR ) ) {
		return false;
	}
	const tabs = tablist.querySelectorAll( 'button[role="tab"]' );
	if ( ! tabs.length ) {
		return false;
	}
	let patternsTab = null;
	let nonPatternCount = 0;
	tabs.forEach( ( tab ) => {
		const label = ( tab.textContent || '' ).trim().toLowerCase();
		if ( label.startsWith( 'pattern' ) ) {
			patternsTab = tab;
		} else {
			nonPatternCount++;
		}
	} );
	// If there's nothing but Patterns, the tab bar is already trivial — skip.
	// (Also covers other tablists in the inserter, like the category filter.)
	if ( ! patternsTab || nonPatternCount === 0 ) {
		return true;
	}
	tablist.setAttribute( PROCESSED_ATTR, 'true' );
	// Activate Patterns BEFORE hiding the tablist.
	if ( patternsTab.getAttribute( 'aria-selected' ) !== 'true' ) {
		patternsTab.click();
	}
	// Defer the hide until after framer-motion's slide-in animation finishes
	// (~250ms in core). Hide via the visually-hidden + aria-hidden + tabindex
	// pattern so screen-reader focus isn't dropped out of the inserter.
	setTimeout( () => {
		tablist.setAttribute( 'aria-hidden', 'true' );
		tablist.style.position = 'absolute';
		tablist.style.width = '1px';
		tablist.style.height = '1px';
		tablist.style.padding = '0';
		tablist.style.margin = '-1px';
		tablist.style.overflow = 'hidden';
		tablist.style.clip = 'rect(0, 0, 0, 0)';
		tablist.style.whiteSpace = 'nowrap';
		tablist.style.border = '0';
		tablist
			.querySelectorAll( 'button, a, [tabindex]' )
			.forEach( ( node ) => node.setAttribute( 'tabindex', '-1' ) );
	}, 350 );
	return true;
}

function findInserter() {
	return (
		document.querySelector( '.block-editor-inserter__menu' ) ||
		document.querySelector( '.editor-inserter-sidebar' ) ||
		document.querySelector( '.edit-site-layout__inserter-panel' )
	);
}

export function setupEasyPatternsOnly( level ) {
	if ( observer ) {
		observer.disconnect();
		observer = null;
	}
	if ( level !== 'easy' || typeof document === 'undefined' ) {
		return;
	}
	observer = new MutationObserver( () => {
		const inserter = findInserter();
		if ( inserter ) {
			processInserter( inserter );
		}
	} );
	observer.observe( document.body, { childList: true, subtree: true } );
}
