/**
 * Simple mode: lock removal on root-level blocks in the canvas.
 *
 * Guardrail so a stray Backspace or "Delete" in the options menu can't
 * wipe out an entire pattern or section. Only the top-level blocks are
 * locked — inner blocks are intentionally left alone.
 *
 * Why root-only:
 *   - Walking into pattern (`core/block`) or template-part inner blocks
 *     and mutating their `lock` attribute writes to the *pattern* entity
 *     (not the post), so the lock can be persisted into the saved pattern
 *     markup and survive a level switch back to Advanced (issue #17).
 *   - Cheaper: subscription fires constantly, so a single shallow pass is
 *     much less work than a recursive walk on every state change.
 *
 * Move is intentionally NOT locked — only removal.
 *
 * Plugin is already enqueued only on `site-editor.php`, so no extra
 * editor-context check is needed here.
 */

import { select, dispatch, subscribe } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';

let unsubscribe = null;

function applyLocks() {
	const editor = select( blockEditorStore );
	if ( ! editor ) {
		return;
	}
	const blockEditor = dispatch( blockEditorStore );
	const rootIds = editor.getBlockOrder();
	rootIds.forEach( ( clientId ) => {
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
