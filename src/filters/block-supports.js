/**
 * Advanced mode: populate `__experimentalDefaultControls` for every support
 * the block declares, so each control is visible by default in the
 * ToolsPanel instead of hiding in the "more" menu.
 *
 * Simple mode's "color + font-size only" curation was previously done here
 * via `minimizeSupports`, mutating block registration at boot. That moved
 * to PHP `wp_theme_json_data_default` (see `game-mode.php`) — settings
 * gate which inspector controls render, which is the layer themes
 * themselves work at and the layer the Curating the Editor Experience
 * guide recommends. The block-registration mutation went away with it.
 *
 * Intermediate mode is a no-op here (Core defaults).
 *
 * `__experimentalDefaultControls` has no theme.json equivalent — it's a
 * per-block convention on `supports` — so the Advanced path stays in JS.
 */

import { addFilter } from '@wordpress/hooks';

import { LEVELS } from '../levels';

const FILTER_NAMESPACE = 'game-mode/block-supports';

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
