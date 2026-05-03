/**
 * Bundles the configurable distraction-free pieces from Gutenberg PR #74546
 * into the plugin so Easy/Medium can offer gradation today.
 *
 * Two new sub-preferences:
 * - `showSimpleTopbar` — when false, hide inserter/list-view/zoom toggles.
 * - `showBlockHelpers` — when false, hide insertion points, in-between
 *    inserter, grid visualizer, and block highlight effects.
 *
 * Approach: read the current level's prefs and inject scoped CSS that hides
 * the corresponding affordances. CSS-only is sufficient because none of these
 * affordances enable functionality not available elsewhere — they're purely
 * visual chrome the user has opted out of for that level.
 */

import { LEVELS } from '../levels';

const STYLE_ID = 'game-mode-distraction-free-config';

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
