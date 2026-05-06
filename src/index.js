/**
 * Game Mode — entry point.
 *
 * Registers block-support filters using the level read from preferences at
 * registration time, and mounts the level picker modal + persistent switcher
 * using the @wordpress/plugins API.
 */

import { registerPlugin } from '@wordpress/plugins';
import { dispatch, select, useSelect } from '@wordpress/data';
import { store as preferencesStore } from '@wordpress/preferences';
import { store as coreStore } from '@wordpress/core-data';
import { useState, useEffect, useCallback, createPortal } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { store as noticesStore } from '@wordpress/notices';
import { __experimentalConfirmDialog as ConfirmDialog } from '@wordpress/components';

import { LEVELS, LEVEL_KEYS } from './levels';
import { useLevel, useSetLevel, SCOPE, KEY } from './store';
import { registerBlockSupportsFilter } from './filters/block-supports';
import { registerThemeBlocksInserterFilter } from './filters/theme-blocks-inserter';
import { applyDistractionFreeConfig } from './filters/distraction-free-config';
import { setupEasyPatternsOnly } from './filters/easy-patterns-only-inserter';
import { setupEasyStylesMenu } from './filters/easy-styles-menu';
import { setupEasyBlockInspector } from './filters/easy-block-inspector';
import { setupBlockDirectoryControl } from './filters/block-directory';
import { setupHardNoContentOnly } from './filters/hard-no-content-only';
import { setupEasyLockRemove } from './filters/easy-lock-remove';
import LevelPickerModal from './components/LevelPickerModal';
import LevelSwitcher from './components/LevelSwitcher';

import './style.scss';

/**
 * Resolve the active level synchronously at module load.
 * Filters need this *before* registerBlockType runs.
 *
 * Source of truth is `window.gameModeInitial` — localized by PHP from user
 * meta. The preferences store hydrates asynchronously and would be empty at
 * this point in the bundle's execution.
 */
function readInitialLevel() {
	const fromWindow = typeof window !== 'undefined' ? window.gameModeInitial : null;
	if ( LEVEL_KEYS.includes( fromWindow ) ) {
		return fromWindow;
	}
	try {
		const value = select( preferencesStore ).get( SCOPE, KEY );
		return LEVEL_KEYS.includes( value ) ? value : null;
	} catch ( e ) {
		return null;
	}
}

let cachedLevel = readInitialLevel();
const getLevel = () => cachedLevel;

// Seed preferences store from the localized value so the rest of the app
// (hooks, switcher, modal) can read it the normal way.
if ( cachedLevel ) {
	try {
		dispatch( preferencesStore ).set( SCOPE, KEY, cachedLevel );
	} catch ( e ) {}
}

// Register registerBlockType filters once at module load.
registerBlockSupportsFilter( getLevel );
registerThemeBlocksInserterFilter( getLevel );

// Apply distraction-free CSS as soon as the document is ready and tag the
// body so level-scoped CSS rules (like Advanced mode's "no hidden controls") fire.
if ( cachedLevel ) {
	applyDistractionFreeConfig( cachedLevel );
	if ( typeof document !== 'undefined' ) {
		document.body.dataset.gameMode = cachedLevel;
	}
	setupEasyPatternsOnly( cachedLevel );
	setupEasyStylesMenu( cachedLevel );
	setupEasyBlockInspector( cachedLevel );
	setupBlockDirectoryControl( cachedLevel );
	setupHardNoContentOnly( cachedLevel );
	setupEasyLockRemove( cachedLevel );
	// Re-apply preferences for the active level on every boot so
	// `distractionFree`, `showListView`, etc. reflect the level instead of
	// whatever the user had set last session. We dispatch into two scopes:
	//   - `core` for editor-wide prefs (the bulk in `cfg.prefs`).
	//   - `core/edit-site` for Site Editor-specific prefs (e.g.
	//     `enableChoosePatternModal`).
	const cfg = LEVELS[ cachedLevel ];
	if ( cfg ) {
		Object.entries( cfg.prefs || {} ).forEach( ( [ name, value ] ) => {
			try {
				dispatch( preferencesStore ).set( 'core', name, value );
			} catch ( e ) {}
		} );
		Object.entries( cfg.editSitePrefs || {} ).forEach( ( [ name, value ] ) => {
			try {
				dispatch( preferencesStore ).set( 'core/edit-site', name, value );
			} catch ( e ) {}
		} );
	}
}

/**
 * Returns true when the editor has unsaved changes worth confirming
 * before a reload.
 */
function hasUnsavedEdits() {
	try {
		const dirty = select( coreStore ).__experimentalGetDirtyEntityRecords?.() || [];
		return dirty.length > 0;
	} catch ( e ) {
		return false;
	}
}

function GameModeUI() {
	const level = useLevel();
	const setLevel = useSetLevel();
	const [ pickerOpen, setPickerOpen ] = useState( false );
	const [ pendingSwitch, setPendingSwitch ] = useState( null ); // { next, wasFirstRun }

	const isFirstRun = ! level;

	useEffect( () => {
		if ( level ) {
			cachedLevel = level;
			applyDistractionFreeConfig( level );
			document.body.dataset.gameMode = level;
			setupEasyPatternsOnly( level );
			setupEasyStylesMenu( level );
			setupEasyBlockInspector( level );
			setupBlockDirectoryControl( level );
			setupHardNoContentOnly( level );
			setupEasyLockRemove( level );
		}
	}, [ level ] );

	// Avoid layering the first-run picker on top of WP's welcome guide. Wait
	// until the welcome guide preference flips off (user dismissed it) before
	// auto-opening.
	const welcomeGuideOpen = useSelect( ( s ) => {
		const prefs = s( preferencesStore );
		return (
			!! prefs.get( 'core/edit-site', 'welcomeGuide' ) ||
			!! prefs.get( 'core/edit-site', 'welcomeGuideStyles' ) ||
			!! prefs.get( 'core/edit-post', 'welcomeGuide' ) ||
			!! prefs.get( 'core/editor', 'welcomeGuide' )
		);
	}, [] );

	useEffect( () => {
		if ( isFirstRun && ! welcomeGuideOpen ) {
			setPickerOpen( true );
		}
	}, [ isFirstRun, welcomeGuideOpen ] );

	const performSwitch = useCallback(
		async ( next, wasFirstRun ) => {
			await setLevel( next );
			if ( ! wasFirstRun ) {
				dispatch( noticesStore ).createInfoNotice(
					sprintf(
						/* translators: %s: level label */
						__( 'Switching to %s mode…', 'game-mode' ),
						LEVELS[ next ].label
					),
					{ type: 'snackbar' }
				);
			}
			setTimeout( () => window.location.reload(), wasFirstRun ? 0 : 400 );
		},
		[ setLevel ]
	);

	const handleConfirm = useCallback(
		async ( next ) => {
			const wasFirstRun = isFirstRun;
			const wasSameLevel = next === level;
			setPickerOpen( false );

			if ( wasSameLevel && ! wasFirstRun ) {
				return;
			}

			// Switching levels requires a reload (block-registration filters only
			// run once). Confirm first if there are unsaved edits.
			if ( hasUnsavedEdits() ) {
				setPendingSwitch( { next, wasFirstRun } );
				return;
			}

			await performSwitch( next, wasFirstRun );
		},
		[ isFirstRun, level, performSwitch ]
	);

	const handleSaveAndSwitch = useCallback( async () => {
		const pending = pendingSwitch;
		if ( ! pending ) {
			return;
		}
		try {
			const dirty = select( coreStore ).__experimentalGetDirtyEntityRecords?.() || [];
			await Promise.all(
				dirty.map( ( { kind, name, key } ) =>
					dispatch( coreStore ).saveEditedEntityRecord( kind, name, key )
				)
			);
		} catch ( e ) {
			dispatch( noticesStore ).createErrorNotice(
				__( 'Could not save before switching. Please try again.', 'game-mode' ),
				{ type: 'snackbar' }
			);
			setPendingSwitch( null );
			return;
		}
		setPendingSwitch( null );
		await performSwitch( pending.next, pending.wasFirstRun );
	}, [ pendingSwitch, performSwitch ] );

	const handleDiscardAndSwitch = useCallback( async () => {
		const pending = pendingSwitch;
		setPendingSwitch( null );
		if ( pending ) {
			await performSwitch( pending.next, pending.wasFirstRun );
		}
	}, [ pendingSwitch, performSwitch ] );

	const handleSwitcherChange = useCallback(
		( next ) => handleConfirm( next ),
		[ handleConfirm ]
	);

	// `registerPlugin` mounts our component inside a `display: none` host so
	// children don't render. Portal out to `document.body` to escape that.
	return createPortal(
		<>
			{ pickerOpen && (
				<LevelPickerModal
					currentLevel={ level }
					isFirstRun={ isFirstRun }
					onConfirm={ handleConfirm }
					onClose={ () => setPickerOpen( false ) }
				/>
			) }
			{ pendingSwitch && (
				<ConfirmDialog
					isOpen
					title={ __( 'Save before switching?', 'game-mode' ) }
					confirmButtonText={ __( 'Save and switch', 'game-mode' ) }
					cancelButtonText={ __( 'Cancel', 'game-mode' ) }
					onConfirm={ handleSaveAndSwitch }
					onCancel={ () => setPendingSwitch( null ) }
				>
					<p>
						{ sprintf(
							/* translators: %s: target level label */
							__(
								'You have unsaved changes. Switching to %s will reload the editor.',
								'game-mode'
							),
							LEVELS[ pendingSwitch.next ].label
						) }
					</p>
					<p>
						<button
							type="button"
							className="game-mode-confirm-discard"
							onClick={ handleDiscardAndSwitch }
						>
							{ __( 'Discard changes and switch', 'game-mode' ) }
						</button>
					</p>
				</ConfirmDialog>
			) }
			{ level && (
				<LevelSwitcher
					level={ level }
					onChange={ handleSwitcherChange }
					onOpenPicker={ () => setPickerOpen( true ) }
				/>
			) }
		</>,
		document.body
	);
}

registerPlugin( 'game-mode', {
	render: GameModeUI,
} );
