/**
 * Simple mode block inspector restrictions:
 *
 * 1. Auto-select the Styles tab when the inspector tabs render (so the user
 *    doesn't land on a hidden Settings tab and see an empty inspector).
 * 2. Hide PanelBody / ToolsPanel sections in the inspector whose visible
 *    label matches an unwanted category (Layout, Dimensions, Border, etc.).
 *
 * Done in JS rather than CSS because panel headers use their visible text,
 * not `aria-label`, so CSS attribute selectors (and `:has()` with them) can't
 * match.
 */

import { select } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

import { getObserverTarget } from './observer-target';

let observer = null;
const STYLES_TAB_PROCESSED = 'data-game-mode-styles-activated';
const PANEL_HIDDEN = 'data-game-mode-panel-hidden';

/**
 * Hide an element from sighted users AND from the accessibility tree without
 * dropping focus to <body>. We:
 *   - Set `aria-hidden="true"` so screen readers skip it.
 *   - Set `tabindex="-1"` on the element and any focusable descendants so
 *     they can't be reached via keyboard navigation.
 *   - Apply visually-hidden CSS (clip + offscreen) so the element keeps a
 *     1×1 box in layout — preserves any focus management that core may
 *     have done before our hide ran.
 */
function hideAccessibly( el ) {
	if ( ! el || el.dataset.gameModeHidden === 'true' ) {
		return;
	}
	el.setAttribute( 'aria-hidden', 'true' );
	el.style.position = 'absolute';
	el.style.width = '1px';
	el.style.height = '1px';
	el.style.padding = '0';
	el.style.margin = '-1px';
	el.style.overflow = 'hidden';
	el.style.clip = 'rect(0, 0, 0, 0)';
	el.style.whiteSpace = 'nowrap';
	el.style.border = '0';
	el.querySelectorAll( 'button, a, input, select, [tabindex]' ).forEach(
		( node ) => {
			node.setAttribute( 'tabindex', '-1' );
		}
	);
	el.dataset.gameModeHidden = 'true';
}

/**
 * Panel headers we hide on Simple. Stored as the canonical English label —
 * `getHiddenPanelLabels()` adds the active-locale translation at runtime via
 * the core (`default`) textdomain so non-English locales also match.
 *
 * Label drift in core (e.g. "Dimensions" → "Spacing") still breaks us
 * silently: ToolsPanel does not expose a stable `data-*` identifier today.
 * TODO: when Gutenberg ships a stable panel-id attribute, prefer that over
 * label matching. Tracked here: https://github.com/WordPress/gutenberg
 */
const HIDDEN_PANEL_LABELS_EN = [
	'Layout',
	'Dimensions',
	'Border',
	'Position',
	'Shadow',
	'Background',
	'Advanced',
];

function getHiddenPanelLabels() {
	const set = new Set();
	HIDDEN_PANEL_LABELS_EN.forEach( ( en ) => {
		set.add( en.toLowerCase() );
		// `__()` with the default (core) textdomain picks up Gutenberg's
		// shipped translations when they're present on the page. Falls back
		// to the source string when no translation is registered.
		const translated = __( en ).trim().toLowerCase();
		if ( translated ) {
			set.add( translated );
		}
	} );
	return set;
}

let hiddenPanelLabels = getHiddenPanelLabels();

function isPatternBlockInspector() {
	// When a pattern wrapper is selected, skip Styles auto-activation so the
	// user lands on Settings (Content list + Edit pattern) and styling the
	// pattern wrapper isn't possible without explicit opt-in.
	//
	// Detect via block name (`core/block` — the canonical synced-pattern
	// block) rather than DOM-matching the visible "Edit pattern" button
	// text, which breaks on Gutenberg label rewordings and in non-English
	// locales.
	return select( blockEditorStore ).getSelectedBlock()?.name === 'core/block';
}

function activateStylesTab( root ) {
	const tabs = root.querySelectorAll(
		'.block-editor-block-inspector__tabs [role="tablist"] button[role="tab"]'
	);
	if ( ! tabs.length ) {
		return;
	}
	if ( isPatternBlockInspector() ) {
		const tablist = tabs[ 0 ].closest( '[role="tablist"]' );
		if ( tablist ) {
			hideAccessibly( tablist );
		}
		return;
	}
	const tablist = tabs[ 0 ].closest( '[role="tablist"]' );
	if ( tablist?.hasAttribute( STYLES_TAB_PROCESSED ) ) {
		return;
	}
	let stylesTab = null;
	tabs.forEach( ( tab ) => {
		// The tab is icon-only — check aria-label first, fall back to text.
		const aria = ( tab.getAttribute( 'aria-label' ) || '' ).trim().toLowerCase();
		const text = ( tab.textContent || '' ).trim().toLowerCase();
		if ( aria === 'styles' || text === 'styles' ) {
			stylesTab = tab;
		}
	} );
	if ( ! stylesTab ) {
		return;
	}
	if ( tablist ) {
		tablist.setAttribute( STYLES_TAB_PROCESSED, 'true' );
	}
	if ( stylesTab.getAttribute( 'aria-selected' ) !== 'true' ) {
		stylesTab.click();
	}
	// After activation, hide the entire tablist — only Styles is meaningful
	// in Simple mode. Defer so framer-motion / focus management isn't disrupted.
	if ( tablist ) {
		setTimeout( () => {
			hideAccessibly( tablist );
		}, 250 );
	}
}

/**
 * Read the visible heading text of a panel-header button.
 */
function readPanelLabel( panel ) {
	const header = panel.querySelector(
		'.components-panel__body-toggle, .components-tools-panel-header, h2 button'
	);
	if ( ! header ) {
		return '';
	}
	return ( header.textContent || '' ).trim().toLowerCase();
}

function hidePanelsByLabel( root ) {
	const panels = root.querySelectorAll(
		'.components-panel__body, .components-tools-panel'
	);
	panels.forEach( ( panel ) => {
		if ( panel.hasAttribute( PANEL_HIDDEN ) ) {
			return;
		}
		const label = readPanelLabel( panel );
		if ( ! label ) {
			return;
		}
		// Match by exact label or first-word (e.g. "Layout" vs "Layout · Group").
		const firstWord = label.split( /\s+/ )[ 0 ];
		if ( hiddenPanelLabels.has( label ) || hiddenPanelLabels.has( firstWord ) ) {
			panel.style.display = 'none';
			panel.setAttribute( PANEL_HIDDEN, 'true' );
		}
	} );
}

export function setupEasyBlockInspector( level ) {
	if ( observer ) {
		observer.disconnect();
		observer = null;
	}
	if ( level !== 'easy' || typeof document === 'undefined' ) {
		return;
	}
	observer = new MutationObserver( () => {
		const inspectors = document.querySelectorAll(
			'.block-editor-block-inspector'
		);
		inspectors.forEach( ( el ) => {
			activateStylesTab( el );
			hidePanelsByLabel( el );
		} );
	} );
	const target = getObserverTarget();
	if ( target ) {
		observer.observe( target, { childList: true, subtree: true } );
	}
}
