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

function applyLocks() {
	const editor = select( blockEditorStore );
	if ( ! editor ) {
		return;
	}
	const rootIds = editor.getBlockOrder();
	walkClientIds( editor, rootIds, ( clientId ) => {
		const block = editor.getBlock( clientId );
		if ( ! block || ! isFromPattern( block ) ) {
			return;
		}
		const mode = editor.getBlockEditingMode?.( clientId );
		if ( mode === 'contentOnly' ) {
			return;
		}
		dispatch( blockEditorStore ).setBlockEditingMode?.(
			clientId,
			'contentOnly'
		);
	} );
}

export function setupPatternContentOnly( level ) {
	if ( unsubscribe ) {
		unsubscribe();
		unsubscribe = null;
	}
	if ( level !== 'easy' && level !== 'medium' ) {
		return;
	}
	unsubscribe = subscribe( applyLocks, blockEditorStore );
	applyLocks();
}
