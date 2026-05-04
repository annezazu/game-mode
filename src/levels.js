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
		label: __( 'Simple', 'game-mode' ),
		tagline: __( 'Quick edits, no distractions.', 'game-mode' ),
		description: __(
			'Best when you just want to update text, swap an image, or tweak colors. Your theme\'s layout stays put so nothing breaks.',
			'game-mode'
		),
		icon: pencil,
		accent: '#10b981',
		changes: [
			__( 'Only the essential blocks shown', 'game-mode' ),
			__( 'Basic styling controls — complex ones hidden', 'game-mode' ),
			__( 'Cleaner toolbar with fewer distractions', 'game-mode' ),
			__( 'Patterns offer simplified editing', 'game-mode' ),
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
			focusMode: true,
		},
	},
	medium: {
		key: 'medium',
		label: __( 'Intermediate', 'game-mode' ),
		tagline: __( 'Make it your own.', 'game-mode' ),
		description: __(
			'Best when you want to add new sections, rearrange the page, or build something fresh — without redesigning the whole site.',
			'game-mode'
		),
		icon: tool,
		accent: '#3b82f6',
		changes: [
			__( 'Every block at your fingertips', 'game-mode' ),
			__( 'Full toolbar with list view and navigation', 'game-mode' ),
			__( 'All global styling options available', 'game-mode' ),
			__( 'Patterns offer simplified editing', 'game-mode' ),
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
			focusMode: false,
		},
	},
	hard: {
		key: 'hard',
		label: __( 'Advanced', 'game-mode' ),
		tagline: __( 'Full theme designer.', 'game-mode' ),
		description: __(
			'Best for designing or rebuilding a theme from scratch. Every control is expanded by default so you can fine-tune layout, spacing, color, and typography down to the pixel.',
			'game-mode'
		),
		icon: shield,
		accent: '#ef4444',
		changes: [
			__( 'All global styling options available', 'game-mode' ),
			__( 'Patterns are fully open by default', 'game-mode' ),
			__( 'All controls stay visible — no hidden options', 'game-mode' ),
			__( 'Built for theme design and full rebuilds', 'game-mode' ),
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
			focusMode: false,
		},
	},
};

export const LEVEL_KEYS = Object.keys( LEVELS );

export const DEFAULT_LEVEL = 'medium';
