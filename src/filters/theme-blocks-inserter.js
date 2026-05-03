/**
 * Hide "theme blocks" from the inserter when the active level disallows them.
 *
 * Theme blocks are anything dynamic that depends on the post/site/query
 * context: navigation, query loop, post-*, template-part, site-*, login-out,
 * loginout, etc. The list mirrors the "Theme" inserter category in core.
 */

import { addFilter } from '@wordpress/hooks';

import { LEVELS } from '../levels';

const FILTER_NAMESPACE = 'game-mode/theme-blocks-inserter';

const THEME_BLOCK_PREFIXES = [
	'core/post-',
	'core/site-',
	'core/template-part',
	'core/query',
	'core/comment',
	'core/comments',
	'core/navigation',
	'core/navigation-link',
	'core/navigation-submenu',
	'core/home-link',
	'core/loginout',
	'core/avatar',
	'core/term-description',
	'core/archives',
	'core/categories',
	'core/calendar',
	'core/latest-posts',
	'core/latest-comments',
	'core/tag-cloud',
	'core/rss',
	'core/search',
	'core/page-list',
	'core/read-more',
];

export function isThemeBlock( name, category ) {
	if ( category === 'theme' ) {
		return true;
	}
	return THEME_BLOCK_PREFIXES.some( ( prefix ) =>
		name === prefix || name.startsWith( prefix )
	);
}

export function registerThemeBlocksInserterFilter( getLevel ) {
	addFilter(
		'blocks.registerBlockType',
		FILTER_NAMESPACE,
		( settings, name ) => {
			const level = getLevel();
			const config = LEVELS[ level ];
			if ( ! config || config.allowThemeBlocks ) {
				return settings;
			}
			if ( ! isThemeBlock( name, settings.category ) ) {
				return settings;
			}
			return {
				...settings,
				supports: {
					...( settings.supports || {} ),
					inserter: false,
				},
			};
		}
	);
}
