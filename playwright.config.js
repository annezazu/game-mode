/**
 * Game Mode Playwright config.
 *
 * Extends the @wordpress/scripts default config so the upstream global setup
 * (admin login, REST setup) keeps working. Overrides:
 *   - `WP_BASE_URL` default points at wp-env's test instance (port 8899) which
 *     is the isolated DB so the suite can mutate state without disturbing the
 *     port-8898 dev instance.
 *   - `testDir` points at our `tests/e2e/specs` folder.
 */

const path = require( 'node:path' );

// `@wordpress/scripts/config/playwright.config.js` reads `WP_BASE_URL` *and*
// `WP_ARTIFACTS_PATH` from `process.env`, so set them before requiring it.
process.env.WP_BASE_URL ??= 'http://localhost:8899';
process.env.WP_ARTIFACTS_PATH ??= path.join(
	process.cwd(),
	'tests/e2e/artifacts'
);

const upstream = require( '@wordpress/scripts/config/playwright.config' );

module.exports = {
	...upstream,
	testDir: path.join( __dirname, 'tests/e2e/specs' ),
	outputDir: path.join(
		process.env.WP_ARTIFACTS_PATH,
		'test-results'
	),
};
