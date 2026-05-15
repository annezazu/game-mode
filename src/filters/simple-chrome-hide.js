/**
 * Hide editor chrome via injected CSS for levels that opted out of it.
 * Bundles the configurable distraction-free pieces from Gutenberg PR #74546
 * so Simple/Intermediate can offer gradation today.
 *
 * NOTE: this file does NOT touch WP's `distractionFree` core preference.
 * (Earlier iterations did, hence the previous file name
 * `distraction-free-config.js`.) Renamed to clarify that the mechanism is
 * purely a CSS overlay — the user's actual distraction-free preference is
 * preserved across level switches.
 *
 * Two sub-preferences read from each level's `prefs`:
 * - `showSimpleTopbar` — when false, hide inserter/list-view/zoom toggles.
 * - `showBlockHelpers` — when false, hide insertion points, in-between
 *    inserter, grid visualizer, and block highlight effects.
 *
 * CSS-only is sufficient because none of these affordances enable
 * functionality not available elsewhere — they're purely visual chrome the
 * user has opted out of for that level.
 */

import { LEVELS } from '../levels';

const STYLE_ID = 'game-mode-simple-chrome-hide';

const CSS_RULES = {
	showSimpleTopbar: {
		false: `
			.edit-site-header-edit-mode__inserter-toggle,
			.editor-document-tools__inserter-toggle,
			.edit-site-header-edit-mode__list-view-toggle,
			.editor-document-tools__document-overview-toggle,
			.editor-zoom-out-toggle {
				display: none !important;
			}
		`,
	},
	showBlockHelpers: {
		false: `
			.block-editor-block-list__insertion-point,
			.block-editor-inserter__toggle.block-editor-button-block-appender,
			.block-editor-block-popover__inbetween-container,
			.block-editor-grid-visualizer,
			.is-hovered > .block-editor-block-list__block,
			.block-editor-block-list__layout > .is-highlighted {
				outline: none !important;
			}
			.block-editor-block-list__insertion-point,
			.block-editor-block-popover__inbetween-container,
			.block-editor-grid-visualizer {
				display: none !important;
			}
		`,
	},
};

export function applyDistractionFreeConfig( level ) {
	const config = LEVELS[ level ];
	if ( ! config ) {
		return;
	}
	let css = '';
	for ( const [ key, rules ] of Object.entries( CSS_RULES ) ) {
		const value = config.prefs[ key ];
		const rule = rules[ String( value ) ];
		if ( rule ) {
			css += rule;
		}
	}

	let style = document.getElementById( STYLE_ID );
	if ( ! style ) {
		style = document.createElement( 'style' );
		style.id = STYLE_ID;
		document.head.appendChild( style );
	}
	style.textContent = css;
}
