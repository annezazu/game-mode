/**
 * Advanced mode: ensure patterns are NOT content-only.
 *
 * WP 7.0 introduced "Pattern Editing mode" — patterns get a special
 * `getBlockEditingMode()` of `'contentOnly'` on the pattern's own client
 * IDs (see https://github.com/WordPress/gutenberg/issues/73775 + linked
 * PRs 73677 / 73679). The lock is no longer just an attribute — it's tracked
 * separately via `setBlockEditingMode( clientId, mode )`.
 *
 * For Advanced mode we want full editing, so we:
 *   1. Subscribe to the block editor.
 *   2. Walk every client ID in the canvas (recursive).
 *   3. For each block whose editing mode is `'contentOnly'`, dispatch
 *      `setBlockEditingMode( clientId, 'default' )`.
 *   4. Also clear legacy `templateLock: 'contentOnly'` on attributes,
 *      in case it's set the older way.
 *
 * The walk is cheap because we only call `setBlockEditingMode` when the
 * mode actually needs to change.
 */

import { select, dispatch, subscribe } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';

import { getObserverTarget } from './observer-target';

let unsubscribe = null;

function clearContentOnly( clientId, attributes ) {
	if ( attributes?.templateLock !== 'contentOnly' ) {
		return;
	}
	const blockEditor = dispatch( blockEditorStore );
	// Mark non-persistent so this clear doesn't dirty the post — otherwise
	// switching levels triggers the browser's "leave site?" dialog instead
	// of our own save-before-switching prompt.
	blockEditor.__unstableMarkNextChangeAsNotPersistent?.();
	blockEditor.updateBlockAttributes( clientId, {
		templateLock: undefined,
	} );
}

function clearEditingMode( editor, clientId ) {
	const mode = editor.getBlockEditingMode?.( clientId );
	// Catch every non-default mode WP 7.0's pattern-editing UX may apply,
	// not just `contentOnly` / `disabled`. The pattern wrapper often lands
	// with mode === undefined briefly while core resolves it; we want to
	// pin it to `default` either way.
	if ( mode && mode !== 'default' ) {
		dispatch( blockEditorStore ).setBlockEditingMode?.( clientId, 'default' );
	}
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

function walkAndClear() {
	const editor = select( blockEditorStore );
	if ( ! editor ) {
		return;
	}
	const rootIds = editor.getBlockOrder();
	walkClientIds( editor, rootIds, ( clientId ) => {
		const block = editor.getBlock( clientId );
		if ( ! block ) {
			return;
		}
		clearEditingMode( editor, clientId );
		clearContentOnly( clientId, block.attributes );
	} );
}

/**
 * In WP 7.0, the inspector renders an "Edit pattern" button on pattern
 * blocks. Clicking it converts the block from rendered-pattern (which has
 * contentOnly editing) into raw editable blocks. In Advanced mode we want that
 * conversion to happen automatically the moment the user selects the block.
 */
let domObserver = null;
const EDIT_PROCESSED = 'data-game-mode-pattern-edit-clicked';

function autoClickEditPattern() {
	const buttons = document.querySelectorAll( 'button' );
	buttons.forEach( ( btn ) => {
		if ( btn.hasAttribute( EDIT_PROCESSED ) ) {
			return;
		}
		const label = ( btn.textContent || '' ).trim().toLowerCase();
		if ( label === 'edit pattern' ) {
			btn.setAttribute( EDIT_PROCESSED, 'true' );
			btn.click();
		}
	} );
}

export function setupHardNoContentOnly( level ) {
	if ( unsubscribe ) {
		unsubscribe();
		unsubscribe = null;
	}
	if ( domObserver ) {
		domObserver.disconnect();
		domObserver = null;
	}
	if ( level !== 'hard' || typeof window === 'undefined' ) {
		return;
	}
	unsubscribe = subscribe( walkAndClear, blockEditorStore );
	walkAndClear();

	// Watch the inspector for the "Edit pattern" button and auto-click it.
	domObserver = new MutationObserver( () => {
		autoClickEditPattern();
	} );
	const target = getObserverTarget();
	if ( target ) {
		domObserver.observe( target, { childList: true, subtree: true } );
	}
	autoClickEditPattern();
}
