/**
 * Single source of truth for level configuration.
 *
 * Each level provides:
 * - meta: label, description, icon, accent color
 * - patternsContentOnly: wrap registered patterns in a contentOnly Group
 * - allowThemeBlocks: false → hide theme/site/post/query/template-part blocks from inserter
 * - blockSupports: 'minimal' | 'default' | 'expanded'
 * - prefs: object of core/preferences values to apply for this level
 *   (keys are core preference names; values are booleans).
 *   Includes the bundled PR #74546 keys (showSimpleTopbar, showBlockHelpers).
 */

import { __ } from '@wordpress/i18n';
import { pencil, tool, shield } from '@wordpress/icons';

export const LEVELS = {
	easy: {
		key: 'easy',
		label: __( 'Easy', 'game-mode' ),
		tagline: __( 'Quick edits, no distractions.', 'game-mode' ),
		description: __(
			'Best when you just want to update text, swap an image, or tweak colors. Your theme\'s layout stays put so nothing breaks.',
			'game-mode'
		),
		icon: pencil,
		accent: '#10b981',
		changes: [
			__( 'Theme blocks hidden from the inserter', 'game-mode' ),
			__( 'Layout, dimensions, and border panels removed', 'game-mode' ),
			__( 'Simplified topbar — no list view or breadcrumbs', 'game-mode' ),
			__( 'Patterns lock as content-only so layouts stay intact', 'game-mode' ),
		],
		patternsContentOnly: true,
		allowThemeBlocks: false,
		blockSupports: 'minimal',
		prefs: {
			// Core's distraction-free fully unmounts the inserter, so we can't
			// keep it on and still let users add patterns. Replicate the
			// minimal feel via the granular helpers (PR #74546) + scoped CSS.
			distractionFree: false,
			fixedToolbar: false,
			showListView: false,
			showBlockBreadcrumbs: false,
			showBlockTools: false,
			showIconLabels: false,
			showSimpleTopbar: true,
			showBlockHelpers: false,
			themeStyles: true,
		},
	},
	medium: {
		key: 'medium',
		label: __( 'Medium', 'game-mode' ),
		tagline: __( 'Make it your own.', 'game-mode' ),
		description: __(
			'Best when you want to add new sections, rearrange the page, or build something fresh — without redesigning the whole site.',
			'game-mode'
		),
		icon: tool,
		accent: '#3b82f6',
		changes: [
			__( 'All blocks available, including theme blocks', 'game-mode' ),
			__( 'List view, breadcrumbs, and block tools enabled', 'game-mode' ),
			__( 'Standard block-support controls', 'game-mode' ),
			__( 'Patterns still lock as content-only', 'game-mode' ),
		],
		patternsContentOnly: true,
		allowThemeBlocks: true,
		blockSupports: 'default',
		prefs: {
			distractionFree: false,
			fixedToolbar: false,
			showListView: true,
			showBlockBreadcrumbs: true,
			showBlockTools: true,
			showIconLabels: false,
			showSimpleTopbar: true,
			showBlockHelpers: true,
			themeStyles: true,
		},
	},
	hard: {
		key: 'hard',
		label: __( 'Hard', 'game-mode' ),
		tagline: __( 'Full theme designer.', 'game-mode' ),
		description: __(
			'Best for designing or rebuilding a theme from scratch. Every control is expanded so you can fine-tune every detail.',
			'game-mode'
		),
		icon: shield,
		accent: '#ef4444',
		changes: [
			__( 'Every block-support panel expanded by default', 'game-mode' ),
			__( 'Patterns fully editable — no content-only lock', 'game-mode' ),
			__( 'ToolsPanel ellipsis menu hidden so controls stay visible', 'game-mode' ),
			__( 'Best for theme design and rebuilding from scratch', 'game-mode' ),
		],
		patternsContentOnly: false,
		allowThemeBlocks: true,
		blockSupports: 'expanded',
		prefs: {
			distractionFree: false,
			fixedToolbar: false,
			showListView: true,
			showBlockBreadcrumbs: true,
			showBlockTools: true,
			showIconLabels: false,
			showSimpleTopbar: true,
			showBlockHelpers: true,
			themeStyles: true,
		},
	},
};

export const LEVEL_KEYS = Object.keys( LEVELS );

export const DEFAULT_LEVEL = 'medium';
