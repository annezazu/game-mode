/**
 * Light mode: lock removal on every block in the canvas.
 *
 * Guardrail so a stray Backspace or "Delete" in the options menu can't
 * wipe out an entire pattern or section. Applies to root AND nested blocks.
 *
 * Implementation:
 *   1. Subscribe to the block editor.
 *   2. Walk every client ID recursively.
 *   3. For any block whose `attributes.lock.remove` isn't already true,
 *      mark the next change as non-persistent and set it.
 *
 * Non-persistent means the lock is editor-only — it never writes back to
 * post content, so leaving Light mode (or opening the post in another
 * editor) restores normal behaviour.
 *
 * Move is intentionally NOT locked — only removal.
 *
 * Plugin is already enqueued only on `site-editor.php`, so no extra
 * editor-context check is needed here.
 */

import { select, dispatch, subscribe } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';

let unsubscribe = null;

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
		if ( ! block ) {
			return;
		}
		const currentLock = block.attributes?.lock;
		if ( currentLock?.remove === true ) {
			return;
		}
		blockEditor.__unstableMarkNextChangeAsNotPersistent?.();
		blockEditor.updateBlockAttributes( clientId, {
			lock: { ...( currentLock || {} ), remove: true },
		} );
	} );
}

export function setupEasyLockRemove( level ) {
	if ( unsubscribe ) {
		unsubscribe();
		unsubscribe = null;
	}
	if ( level !== 'easy' || typeof window === 'undefined' ) {
		return;
	}
	unsubscribe = subscribe( applyLocks, blockEditorStore );
	applyLocks();
}
