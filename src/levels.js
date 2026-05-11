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
			'Best when you want to update text, swap an image, or refresh colors without worrying about breaking the layout your theme set up for you.',
			'game-mode'
		),
		icon: pencil,
		accent: '#10b981',
		changes: [
			__( 'Edit text, images, and colors inside the existing layout', 'game-mode' ),
			__( 'Work with a focused set of everyday blocks', 'game-mode' ),
			__( 'Adjust basic styling like color and font size', 'game-mode' ),
			__( 'Drop in patterns and edit their content', 'game-mode' ),
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
			showIconLabels: false,
			showSimpleTopbar: true,
			showBlockHelpers: false,
			themeStyles: true,
			focusMode: true,
		},
		editSitePrefs: {
			// Pattern-first onboarding for the most constrained level.
			enableChoosePatternModal: true,
		},
	},
	medium: {
		key: 'medium',
		label: __( 'Intermediate', 'game-mode' ),
		tagline: __( 'Build pages your way.', 'game-mode' ),
		description: __(
			'Best when you want to add new sections, rearrange a page, or create something fresh — while keeping the overall site design intact.',
			'game-mode'
		),
		icon: tool,
		accent: '#3b82f6',
		changes: [
			__( 'Add, remove, and rearrange any block on the page', 'game-mode' ),
			__( 'Use every block, including theme blocks', 'game-mode' ),
			__( 'Fine-tune styling with the full set of standard controls', 'game-mode' ),
			__( 'Drop in patterns and edit their content', 'game-mode' ),
		],
		patternsContentOnly: true,
		allowThemeBlocks: true,
		blockSupports: 'default',
		prefs: {
			distractionFree: false,
			fixedToolbar: false,
			showListView: true,
			showBlockBreadcrumbs: true,
			showIconLabels: false,
			showSimpleTopbar: true,
			showBlockHelpers: true,
			themeStyles: true,
			focusMode: false,
		},
		// Preferences that live in the `core/edit-site` scope rather than `core`.
		editSitePrefs: {
			// Make new pages always start from a pattern — the Intermediate
			// mental model is "compose pages from patterns".
			enableChoosePatternModal: true,
		},
	},
	hard: {
		key: 'hard',
		label: __( 'Advanced', 'game-mode' ),
		tagline: __( 'Design the whole theme.', 'game-mode' ),
		description: __(
			'Best when you\'re designing or rebuilding a theme from scratch. Every control is open so you can shape layout, spacing, color, and typography down to the pixel.',
			'game-mode'
		),
		icon: shield,
		accent: '#ef4444',
		changes: [
			__( 'Fine-tune layout, spacing, color, and typography.', 'game-mode' ),
			__( 'Edit every part of any pattern, fully unlocked by default', 'game-mode' ),
			__( 'Reach every control without digging through menus.', 'game-mode' ),
			__( 'Install new blocks from the block directory', 'game-mode' ),
		],
		patternsContentOnly: false,
		allowThemeBlocks: true,
		blockSupports: 'expanded',
		prefs: {
			distractionFree: false,
			fixedToolbar: false,
			showListView: true,
			showBlockBreadcrumbs: true,
			showIconLabels: false,
			showSimpleTopbar: true,
			showBlockHelpers: true,
			themeStyles: true,
			focusMode: false,
		},
		editSitePrefs: {
			// Designers don't want the choose-pattern prompt — let them
			// drop into a blank canvas.
			enableChoosePatternModal: false,
		},
	},
};

export const LEVEL_KEYS = Object.keys( LEVELS );

export const DEFAULT_LEVEL = 'medium';
