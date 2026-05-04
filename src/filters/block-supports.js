/**
 * Two block-support filters, switched on by the active level:
 *
 * 1. `minimal` (Easy) — strip every block-support category from the inspector
 *    except color and typography.fontSize, then expand
 *    `__experimentalDefaultControls` on the survivors so every kept control
 *    (e.g. Link color) renders up-front rather than hiding in the
 *    ToolsPanel "more" menu.
 *
 * 2. `expanded` (Hard) — port and extend Create Block Theme PR #824:
 *    populate `__experimentalDefaultControls` for every support the block
 *    declares, so each control is visible by default in the ToolsPanel.
 *
 * `default` (Medium) is a no-op.
 */

import { addFilter } from '@wordpress/hooks';

import { LEVELS } from '../levels';

const FILTER_NAMESPACE = 'game-mode/block-supports';

/**
 * Strip every support except color + typography.fontSize.
 * Pure — exported for testing.
 */
export function minimizeSupports( supports ) {
	if ( ! supports || typeof supports !== 'object' ) {
		return supports;
	}
	const next = {};
	if ( supports.color ) {
		next.color = supports.color;
	}
	if ( supports.typography ) {
		const t = supports.typography;
		const allowed = {};
		if ( t.fontSize ) {
			allowed.fontSize = t.fontSize;
		}
		if ( t.__experimentalFontSize ) {
			allowed.__experimentalFontSize = t.__experimentalFontSize;
		}
		if ( Object.keys( allowed ).length ) {
			next.typography = allowed;
		}
	}
	// Always preserve infrastructure supports — these don't show as inspector
	// controls but they govern how the block registers, parses, and lays out.
	// Stripping `layout` / `align` causes Group/Header/Query blocks to render
	// full-bleed instead of constrained to the theme's contentSize.
	[
		'anchor',
		'className',
		'customClassName',
		'html',
		'inserter',
		'multiple',
		'reusable',
		'lock',
		'align',
		'alignWide',
		'layout',
		'__experimentalLayout',
		'__experimentalSlashInserter',
		'splitting',
		'renaming',
		'interactivity',
	].forEach( ( key ) => {
		if ( supports[ key ] !== undefined ) {
			next[ key ] = supports[ key ];
		}
	} );
	return next;
}

/**
 * Every known `__experimentalDefaultControls` key per support namespace.
 *
 * The ToolsPanel reads `__experimentalDefaultControls` to decide which items
 * are visible by default vs hidden in the "more" menu. Setting a key to
 * `true` for a control the block doesn't actually support is a no-op — the
 * panel only renders items for declared supports. So we set them all.
 *
 * Sourced from @wordpress/block-editor inspector panels on trunk:
 * typography-panel.js, color-panel.js, dimensions-panel.js, border-panel.js,
 * background-panel.js, shadow-panel.js, position-panel.js.
 */
export const SUPPORT_CONTROLS = {
	typography: [
		'fontFamily',
		'fontSize',
		'fontAppearance',
		'fontStyle',
		'fontWeight',
		'lineHeight',
		'letterSpacing',
		'textColumns',
		'textDecoration',
		'textTransform',
		'writingMode',
	],
	color: [
		'text',
		'background',
		'link',
		'button',
		'heading',
		'caption',
	],
	spacing: [ 'padding', 'margin', 'blockGap' ],
	dimensions: [ 'minHeight', 'aspectRatio' ],
	__experimentalBorder: [ 'color', 'radius', 'style', 'width' ],
	background: [ 'backgroundImage', 'backgroundSize' ],
	shadow: [ 'shadow' ],
	position: [ 'position' ],
};

/**
 * Walks a block's supports and returns a `{ namespace: { default-controls } }`
 * patch suitable for spreading into `supports`. Sets every known control true
 * for every namespace the block declares — controls without backing supports
 * are silently dropped by the panel. Pure — exported for testing.
 */
export function expandDefaultControls( supports ) {
	if ( ! supports || typeof supports !== 'object' ) {
		return {};
	}
	const patch = {};
	for ( const [ namespace, controls ] of Object.entries( SUPPORT_CONTROLS ) ) {
		const declared = supports[ namespace ];
		if ( ! declared ) {
			continue;
		}
		const defaults = {};
		controls.forEach( ( control ) => {
			defaults[ control ] = true;
		} );
		const existing = ( typeof declared === 'object' && declared.__experimentalDefaultControls ) || {};
		patch[ namespace ] = {
			...( typeof declared === 'object' ? declared : {} ),
			__experimentalDefaultControls: { ...existing, ...defaults },
		};
	}
	return patch;
}

/**
 * Register the registerBlockType filter. Reads the current level once per
 * registration. Level changes that affect supports require a soft reload —
 * handled by the switcher.
 */
export function registerBlockSupportsFilter( getLevel ) {
	addFilter(
		'blocks.registerBlockType',
		FILTER_NAMESPACE,
		( settings ) => {
			const level = getLevel();
			const config = LEVELS[ level ];
			if ( ! config || ! settings.supports ) {
				return settings;
			}
			if ( config.blockSupports === 'minimal' ) {
				const minimized = minimizeSupports( settings.supports );
				return {
					...settings,
					supports: { ...minimized, ...expandDefaultControls( minimized ) },
				};
			}
			if ( config.blockSupports === 'expanded' ) {
				return {
					...settings,
					supports: { ...settings.supports, ...expandDefaultControls( settings.supports ) },
				};
			}
			return settings;
		}
	);
}
