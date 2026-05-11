/**
 * Simple + Intermediate: mark inserted patterns' inner structure as
 * content-only, leaving the pattern wrapper itself fully editable.
 *
 * Runtime counterpart to `hard-no-content-only.js`. Walks the canvas and
 * sets `contentOnly` editing mode on any block carrying
 * `attributes.metadata.patternName` — the marker WP 7.0+ stamps on
 * pattern-derived blocks. The mode cascades to descendants, so the inner
 * structure of the pattern is locked (no add/remove/reorder of inner
 * blocks) while text, images, and other content remain editable.
 *
 * The wrapper itself stays deletable in all levels. We deliberately do
 * not try to enforce wrapper-non-deletion because there's no clean way
 * to do that in WP 7.0+:
 *
 *   - Setting `attributes.lock.remove` persists into saved markup and
 *     leaks forward when the user later switches to Advanced.
 *   - Setting the editing mode to `'disabled'` is mirrored into
 *     `attributes.lock.remove` by Gutenberg's reducer, so it persists
 *     just the same.
 *   - There is no `canRemoveBlock` filter at the data layer.
 *
 * The level's other guardrails (limited inserter, simplified UI,
 * `contentOnly` cascade on the pattern's inner structure) carry the
 * "won't accidentally break the layout" intent. Wrapper deletion is
 * accepted as part of the WP 7.0 pattern UX.
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
	const blockEditor = dispatch( blockEditorStore );
	const rootIds = editor.getBlockOrder();
	walkClientIds( editor, rootIds, ( clientId ) => {
		const block = editor.getBlock( clientId );
		if ( ! block || ! isFromPattern( block ) ) {
			return;
		}
		if ( editor.getBlockEditingMode?.( clientId ) !== 'contentOnly' ) {
			blockEditor.setBlockEditingMode?.( clientId, 'contentOnly' );
		}
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
