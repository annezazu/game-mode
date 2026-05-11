/**
 * Simple + Intermediate: lock inserted patterns to content-only editing.
 *
 * This is the runtime counterpart to `hard-no-content-only.js`. Where Advanced
 * walks the canvas and *clears* `contentOnly` editing mode, Simple and
 * Intermediate walk the canvas and *set* it for any block that came from a
 * pattern (carries `attributes.metadata.patternName`).
 *
 * Mechanism: `setBlockEditingMode( clientId, 'contentOnly' )` on the
 * `core/block-editor` store. Same API the rest of the plugin uses, no
 * server-side mutation of registered pattern content.
 *
 * Replaces a previous `register_block_pattern_args` PHP filter that wrapped
 * every registered pattern's `content` in a `templateLock="contentOnly"`
 * Group block. That had three problems the runtime approach avoids:
 *
 *   1. It mutated stored pattern content — patterns saved back to a child
 *      theme inherited the wrapper.
 *   2. It missed patterns registered via `theme.json` or the `wp_block`
 *      post type.
 *   3. The wrapper Group itself counted as a real block, so the pattern's
 *      original layout (e.g. constrained → wide) was overridden.
 *
 * On WP 7.0+ core itself already applies `contentOnly` editing mode to
 * pattern-inserted blocks. This filter is idempotent in that case — calling
 * `setBlockEditingMode('contentOnly')` on a block that's already content-only
 * is a no-op. On WP < 7.0 (where the new pattern editing UX hadn't landed),
 * this filter provides the lock that the PHP wrapper used to.
 */

import { select, dispatch, subscribe } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';

let unsubscribe = null;

function isFromPattern( block ) {
	return !! block?.attributes?.metadata?.patternName;
}

function walkClientIds( editor, clientIds, visit ) {
	clientIds.forEach( ( id ) => {
		visit( id );
		const inner = editor.getBlockOrder( id );
		if ( inner.length ) {
			walkClientIds( editor, inner, visit );
		}
	} );
}

function needsStructuralLock( currentLock ) {
	return ! currentLock || currentLock.remove !== true || currentLock.move !== true;
}

function applyLocks() {
	const editor = select( blockEditorStore );
	if ( ! editor ) {
		return;
	}
	const blockEditor = dispatch( blockEditorStore );
	const rootIds = editor.getBlockOrder();
	walkClientIds( editor, rootIds, ( clientId ) => {
		const block = editor.getBlock( clientId );
		if ( ! block || ! isFromPattern( block ) ) {
			return;
		}
		const mode = editor.getBlockEditingMode?.( clientId );
		if ( mode !== 'contentOnly' ) {
			blockEditor.setBlockEditingMode?.( clientId, 'contentOnly' );
		}
		// contentOnly mode locks the wrapper's *children* but not the wrapper
		// itself — without these, the pattern can still be deleted/moved by
		// the parent. Mirrors the old PHP `templateLock="contentOnly"` Group
		// wrapper that this filter replaced.
		const currentLock = block.attributes?.lock;
		if ( needsStructuralLock( currentLock ) ) {
			blockEditor.__unstableMarkNextChangeAsNotPersistent?.();
			blockEditor.updateBlockAttributes( clientId, {
				lock: { ...( currentLock || {} ), remove: true, move: true },
			} );
		}
	} );
}

function clearLocks() {
	const editor = select( blockEditorStore );
	if ( ! editor ) {
		return;
	}
	const blockEditor = dispatch( blockEditorStore );
	const rootIds = editor.getBlockOrder();
	walkClientIds( editor, rootIds, ( clientId ) => {
		const block = editor.getBlock( clientId );
		if ( ! block || ! isFromPattern( block ) ) {
			return;
		}
		const currentLock = block.attributes?.lock;
		if ( ! currentLock ) {
			return;
		}
		const { remove: _r, move: _m, ...rest } = currentLock;
		// Nothing of ours to strip.
		if ( _r === undefined && _m === undefined ) {
			return;
		}
		const nextLock = Object.keys( rest ).length ? rest : undefined;
		blockEditor.__unstableMarkNextChangeAsNotPersistent?.();
		blockEditor.updateBlockAttributes( clientId, { lock: nextLock } );
	} );
}

export function setupPatternContentOnly( level ) {
	if ( unsubscribe ) {
		unsubscribe();
		unsubscribe = null;
	}
	if ( level !== 'easy' && level !== 'medium' ) {
		// Strip the structural locks we applied for previous levels — the
		// editing mode is cleared by hard-no-content-only when needed.
		clearLocks();
		return;
	}
	unsubscribe = subscribe( applyLocks, blockEditorStore );
	applyLocks();
}
