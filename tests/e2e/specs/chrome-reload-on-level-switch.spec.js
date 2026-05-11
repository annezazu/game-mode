/**
 * Regression spec — switching levels must not trigger Chrome's native
 * "Reload site?" beforeunload dialog. WP's editor registers a beforeunload
 * listener via `<UnsavedChangesWarning />` that sets `event.returnValue`
 * whenever the post is dirty. Our intentional `window.location.reload()`
 * in performSwitch must swallow that listener (see
 * `src/before-unload-swallow.js`).
 *
 * Playwright auto-dismisses dialogs, so a regression would surface as
 * `page.on('dialog', …)` firing. We listen, drive a level switch, and
 * assert the listener never sees a beforeunload dialog.
 */

const { test, expect } = require( '@wordpress/e2e-test-utils-playwright' );

async function setLevelMetaAndOpenEditor( { admin, requestUtils, page }, level ) {
	// Seed the user's level via the canonical /wp/v2/users/me REST surface,
	// so the editor boots with that level already selected (no picker).
	await requestUtils.rest( {
		method: 'POST',
		path: '/wp/v2/users/me',
		data: { meta: { game_mode_level: level } },
	} );
	await admin.visitSiteEditor();
	// Wait for our switcher to mount — confirms the bundle has booted and
	// the beforeunload swallower has had a chance to register before WP's
	// `UnsavedChangesWarning` mounts.
	await expect(
		page.getByRole( 'button', { name: /game mode/i } )
	).toBeVisible( { timeout: 30_000 } );
}

test.describe( 'Chrome reload dialog on level switch', () => {
	test.beforeAll( async ( { requestUtils } ) => {
		await requestUtils.activatePlugin( 'game-mode' );
	} );

	test.afterAll( async ( { requestUtils } ) => {
		// Clear the meta so subsequent suites get the first-run picker.
		await requestUtils.rest( {
			method: 'POST',
			path: '/wp/v2/users/me',
			data: { meta: { game_mode_level: '' } },
		} );
	} );

	test( 'Simple → Advanced reload does not raise a native dialog', async ( {
		admin,
		requestUtils,
		page,
	} ) => {
		await setLevelMetaAndOpenEditor( { admin, requestUtils, page }, 'easy' );

		// Track any native dialog the browser tries to show.
		const dialogs = [];
		page.on( 'dialog', ( dialog ) => {
			dialogs.push( { type: dialog.type(), message: dialog.message() } );
			dialog.dismiss().catch( () => {} );
		} );

		// Open switcher → pick Advanced from the dropdown menu. The
		// switcher renders `MenuItem`s with `role="menuitemradio"` (see
		// `src/components/LevelSwitcher.jsx`).
		await page
			.getByRole( 'button', { name: /game mode/i } )
			.click();
		await page
			.getByRole( 'menuitemradio', { name: /advanced/i } )
			.click();

		// performSwitch reloads after a 400ms snackbar delay. Wait for the
		// new editor to settle so any native dialog would have appeared
		// by now.
		await page.waitForLoadState( 'load' );
		await expect(
			page.getByRole( 'button', { name: /game mode: advanced/i } )
		).toBeVisible( { timeout: 30_000 } );

		expect(
			dialogs.filter( ( d ) => d.type === 'beforeunload' )
		).toHaveLength( 0 );
	} );
} );
