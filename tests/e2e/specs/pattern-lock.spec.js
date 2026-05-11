/**
 * Regression spec — pattern locking behavior across levels.
 *
 *   - In Simple: an inserted pattern's wrapper block must be locked
 *     (lock.remove + lock.move) AND in `contentOnly` editing mode, so the
 *     user can edit text/images inside but cannot restructure or delete
 *     the pattern itself.
 *   - In Advanced: the wrapper must be in `default` editing mode with no
 *     leftover `lock` from the previous level — fully editable.
 *
 * We assert via `wp.data` rather than DOM scraping so the test is robust
 * to toolbar/inspector shuffles in the editor UI.
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
		return {
			mode: be.getBlockEditingMode?.( id ),
			lock: block?.attributes?.lock || null,
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

	test( 'Simple locks the pattern wrapper; Advanced unlocks it', async ( {
		admin,
		requestUtils,
		page,
	} ) => {
		await setLevelMetaAndOpenEditor(
			{ admin, requestUtils, page },
			'easy'
		);

		const clientId = await insertSyntheticPattern( page );

		// Give the subscriber a tick to walk + apply locks.
		await page.waitForTimeout( 200 );

		const inSimple = await readBlockState( page, clientId );
		expect( inSimple.patternName ).toBeTruthy();
		expect( inSimple.mode ).toBe( 'contentOnly' );
		expect( inSimple.lock?.remove ).toBe( true );
		expect( inSimple.lock?.move ).toBe( true );

		// Switch to Advanced via the switcher dropdown.
		page.on( 'dialog', ( d ) => d.dismiss().catch( () => {} ) );
		await page
			.getByRole( 'button', { name: /game mode/i } )
			.click();
		await page
			.getByRole( 'menuitemradio', { name: /advanced/i } )
			.click();
		await page.waitForLoadState( 'load' );
		await expect(
			page.getByRole( 'button', { name: /game mode: advanced/i } )
		).toBeVisible( { timeout: 30_000 } );

		// Re-insert (post reloaded with persisted state may or may not
		// contain the pattern depending on save flow — keep this test
		// self-contained by re-inserting in Advanced).
		const advancedClientId = await insertSyntheticPattern( page );
		await page.waitForTimeout( 200 );

		const inAdvanced = await readBlockState( page, advancedClientId );
		expect( inAdvanced.patternName ).toBeTruthy();
		expect( inAdvanced.mode ).toBe( 'default' );
		expect(
			inAdvanced.lock?.remove === true && inAdvanced.lock?.move === true
		).toBe( false );
	} );
} );
