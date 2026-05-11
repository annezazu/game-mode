/**
 * Regression spec — pattern editing mode across levels.
 *
 *   - Simple:       wrapper `contentOnly`  (inner structure locked,
 *                                            content-editable; wrapper
 *                                            itself remains deletable)
 *   - Intermediate: wrapper `contentOnly`  (same)
 *   - Advanced:     wrapper `default`      (fully editable)
 *
 * No attribute writes — locking lives in session-only block editing
 * modes, never serialized into saved markup.
 */

const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

async function setLevelMetaAndOpenEditor( { admin, requestUtils, page }, level ) {
	await requestUtils.rest( {
		method: 'POST',
		path: '/wp/v2/users/me',
		data: { meta: { game_mode_level: level } },
	} );
	await admin.visitSiteEditor();
	await expect(
		page.getByRole( 'button', { name: /game mode/i } )
	).toBeVisible( { timeout: 30_000 } );
}

/**
 * Insert a synthetic pattern-wrapped block (a `core/group` carrying
 * `metadata.patternName`) and return its clientId.
 *
 * The pattern filter's only trigger is the `metadata.patternName` marker —
 * which level the pattern came from (theme.json / wp_block / inserter)
 * doesn't matter. Constructing the block directly avoids depending on
 * theme-supplied patterns being registered in the test environment.
 */
async function insertSyntheticPattern( page ) {
	return page.evaluate( async () => {
		const { dispatch, select } = window.wp.data;
		const inner = window.wp.blocks.createBlock( 'core/paragraph', {
			content: 'inside',
		} );
		const block = window.wp.blocks.createBlock( 'core/group', {}, [
			inner,
		] );
		await dispatch( 'core/block-editor' ).insertBlocks( block );
		const order = select( 'core/block-editor' ).getBlockOrder();
		const clientId = order[ order.length - 1 ];
		// Set the pattern marker post-insert. `createBlock` strips unknown
		// metadata fields against the block's registered schema, but
		// `updateBlockAttributes` writes verbatim — which is also how
		// Gutenberg core stamps `metadata.patternName` on the wrapper
		// when a real pattern is inserted.
		await dispatch( 'core/block-editor' ).updateBlockAttributes(
			clientId,
			{
				metadata: {
					patternName: 'game-mode-e2e/test-pattern',
				},
			}
		);
		return clientId;
	} );
}

async function readBlockState( page, clientId ) {
	return page.evaluate( ( id ) => {
		const be = window.wp.data.select( 'core/block-editor' );
		const block = be.getBlock( id );
		const childIds = be.getBlockOrder( id );
		return {
			mode: be.getBlockEditingMode?.( id ),
			childMode: childIds[ 0 ]
				? be.getBlockEditingMode?.( childIds[ 0 ] )
				: null,
			lock: block?.attributes?.lock || null,
			canRemove: be.canRemoveBlock?.( id ) ?? null,
			patternName: block?.attributes?.metadata?.patternName || null,
		};
	}, clientId );
}

test.describe( 'Pattern lock across levels', () => {
	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.activatePlugin( 'game-mode' );
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await requestUtils.rest( {
			method: 'POST',
			path: '/wp/v2/users/me',
			data: { meta: { game_mode_level: '' } },
		} );
	} );

	test( 'Simple: wrapper editing mode is `contentOnly`', async ( {
		admin,
		requestUtils,
		page,
	} ) => {
		await setLevelMetaAndOpenEditor(
			{ admin, requestUtils, page },
			'easy'
		);
		const clientId = await insertSyntheticPattern( page );
		await page.waitForTimeout( 200 );

		const state = await readBlockState( page, clientId );
		expect( state.patternName ).toBeTruthy();
		expect( state.mode ).toBe( 'contentOnly' );
		expect( state.childMode ).toBe( 'contentOnly' );
	} );

	test( 'Intermediate: wrapper editing mode is `contentOnly`', async ( {
		admin,
		requestUtils,
		page,
	} ) => {
		await setLevelMetaAndOpenEditor(
			{ admin, requestUtils, page },
			'medium'
		);
		const clientId = await insertSyntheticPattern( page );
		await page.waitForTimeout( 200 );

		const state = await readBlockState( page, clientId );
		expect( state.patternName ).toBeTruthy();
		expect( state.mode ).toBe( 'contentOnly' );
		expect( state.childMode ).toBe( 'contentOnly' );
	} );

	test( 'Advanced: wrapper editing mode is `default`', async ( {
		admin,
		requestUtils,
		page,
	} ) => {
		await setLevelMetaAndOpenEditor(
			{ admin, requestUtils, page },
			'hard'
		);
		const clientId = await insertSyntheticPattern( page );
		await page.waitForTimeout( 200 );

		const state = await readBlockState( page, clientId );
		expect( state.patternName ).toBeTruthy();
		expect( state.mode ).toBe( 'default' );
		expect( state.childMode ).toBe( 'default' );
	} );
} );
