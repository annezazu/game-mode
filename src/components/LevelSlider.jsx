import {
	__experimentalVStack as VStack,
	__experimentalHStack as HStack,
	__experimentalText as Text,
	__experimentalHeading as Heading,
	Icon,
} from '@wordpress/components';
import { useState, useRef, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import { LEVELS, LEVEL_KEYS } from '../levels';

/**
 * Slider-style level picker.
 *
 * - Drag the thumb (or click anywhere on the track) to slide between stops.
 * - Click a stop, or use arrow keys / Home / End / Enter, to commit a value.
 * - Hover or focus a stop to preview its summary without committing the
 *   selection. The summary falls back to the committed value otherwise.
 */
export default function LevelSlider( { value, onChange } ) {
	const [ hovered, setHovered ] = useState( null );
	const [ isDragging, setIsDragging ] = useState( false );
	const stops = LEVEL_KEYS;
	const stopRefs = useRef( {} );
	const trackRef = useRef( null );

	const percentForKey = useCallback(
		( key ) => {
			const idx = Math.max( 0, stops.indexOf( key ) );
			return ( idx / ( stops.length - 1 ) ) * 100;
		},
		[ stops ]
	);

	// Free-floating thumb position. Keyboard / clicking a label snaps it to
	// the label's anchor; dragging lets it stop wherever the pointer is
	// released.
	const [ thumbPercent, setThumbPercent ] = useState( () =>
		percentForKey( value ?? stops[ 0 ] )
	);

	// Re-focus the active stop after a keyboard-driven change so arrow
	// navigation feels continuous.
	const lastValueRef = useRef( value );
	useEffect( () => {
		if ( lastValueRef.current !== value && ! isDragging ) {
			stopRefs.current[ value ]?.focus();
		}
		lastValueRef.current = value;
	}, [ value, isDragging ] );

	const previewedKey = hovered ?? value ?? stops[ 0 ];
	const previewed = LEVELS[ previewedKey ];

	const percentFromClientX = useCallback( ( clientX ) => {
		const track = trackRef.current;
		if ( ! track ) {
			return null;
		}
		const rect = track.getBoundingClientRect();
		return Math.max(
			0,
			Math.min( 100, ( ( clientX - rect.left ) / rect.width ) * 100 )
		);
	}, [] );

	const keyFromPercent = useCallback(
		( pct ) => {
			// Split the track into N equal regions so each level claims a
			// third of the rail (Simple 0–33%, Intermediate 33–66%,
			// Advanced 66–100%).
			const idx = Math.min(
				stops.length - 1,
				Math.floor( ( pct / 100 ) * stops.length )
			);
			return stops[ idx ];
		},
		[ stops ]
	);

	// Snap the thumb to a labeled stop; used by clicks and keyboard.
	const commitToKey = ( key ) => {
		setThumbPercent( percentForKey( key ) );
		if ( key !== value ) {
			onChange( key );
		}
	};

	const handlePointerDown = ( e ) => {
		// Ignore clicks that originated on a stop button — those handle
		// themselves and we don't want to start a drag from a focus-driven
		// click.
		if ( e.target.closest( '.game-mode-level-slider__stop' ) ) {
			return;
		}
		e.preventDefault();
		e.currentTarget.setPointerCapture?.( e.pointerId );
		setIsDragging( true );
		const pct = percentFromClientX( e.clientX );
		if ( pct !== null ) {
			setThumbPercent( pct );
			const next = keyFromPercent( pct );
			if ( next !== value ) {
				onChange( next );
			}
		}
	};

	const handlePointerMove = ( e ) => {
		if ( ! isDragging ) {
			return;
		}
		const pct = percentFromClientX( e.clientX );
		if ( pct === null ) {
			return;
		}
		setThumbPercent( pct );
		const next = keyFromPercent( pct );
		if ( next !== value ) {
			onChange( next );
		}
	};

	const handlePointerUp = ( e ) => {
		if ( ! isDragging ) {
			return;
		}
		e.currentTarget.releasePointerCapture?.( e.pointerId );
		setIsDragging( false );
	};

	const handleKeyDown = ( e, key ) => {
		const idx = stops.indexOf( key );
		if ( e.key === 'ArrowRight' || e.key === 'ArrowDown' ) {
			e.preventDefault();
			commitToKey( stops[ Math.min( idx + 1, stops.length - 1 ) ] );
		} else if ( e.key === 'ArrowLeft' || e.key === 'ArrowUp' ) {
			e.preventDefault();
			commitToKey( stops[ Math.max( idx - 1, 0 ) ] );
		} else if ( e.key === 'Home' ) {
			e.preventDefault();
			commitToKey( stops[ 0 ] );
		} else if ( e.key === 'End' ) {
			e.preventDefault();
			commitToKey( stops[ stops.length - 1 ] );
		} else if ( e.key === 'Enter' || e.key === ' ' ) {
			e.preventDefault();
			commitToKey( key );
		}
	};

	const fillPercent = thumbPercent;

	return (
		<VStack spacing={ 5 }>
			<div
				className={ `game-mode-level-slider${
					isDragging ? ' is-dragging' : ''
				}` }
				role="radiogroup"
				aria-label={ __( 'Difficulty level', 'game-mode' ) }
				style={ { '--game-mode-accent': previewed.accent } }
			>
				<div
					className="game-mode-level-slider__track-area"
					onPointerDown={ handlePointerDown }
					onPointerMove={ handlePointerMove }
					onPointerUp={ handlePointerUp }
					onPointerCancel={ handlePointerUp }
				>
					<div
						ref={ trackRef }
						className="game-mode-level-slider__track-rail"
					>
						<div
							className="game-mode-level-slider__track"
							aria-hidden="true"
						>
							<div
								className="game-mode-level-slider__fill"
								style={ { width: `${ fillPercent }%` } }
							/>
						</div>
						<div
							className="game-mode-level-slider__thumb"
							style={ { left: `${ fillPercent }%` } }
							aria-hidden="true"
						/>
						{ stops.map( ( key, idx ) => {
							const level = LEVELS[ key ];
							const isSelected = value === key;
							const isPreviewed = previewedKey === key;
							const stopPercent =
								( idx / ( stops.length - 1 ) ) * 100;
							return (
								<button
									key={ key }
									type="button"
									ref={ ( el ) => ( stopRefs.current[ key ] = el ) }
									className={ `game-mode-level-slider__stop${
										isSelected ? ' is-selected' : ''
									}${ isPreviewed ? ' is-previewed' : '' }` }
									style={ {
										'--stop-accent': level.accent,
										left: `${ stopPercent }%`,
									} }
									role="radio"
									aria-checked={ isSelected }
									tabIndex={
										isSelected || ( ! value && key === stops[ 0 ] )
											? 0
											: -1
									}
									onClick={ () => commitToKey( key ) }
									onMouseEnter={ () => setHovered( key ) }
									onMouseLeave={ () => setHovered( null ) }
									onFocus={ () => setHovered( key ) }
									onBlur={ () => setHovered( null ) }
									onKeyDown={ ( e ) => handleKeyDown( e, key ) }
								>
									<span className="game-mode-level-slider__dot" />
									<span className="game-mode-level-slider__stop-label">
										{ level.label }
									</span>
								</button>
							);
						} ) }
					</div>
				</div>
			</div>

			<div
				className="game-mode-level-slider__summary"
				style={ { '--game-mode-accent': previewed.accent } }
				aria-live="polite"
			>
				<HStack spacing={ 4 } alignment="flex-start">
					<span
						className="game-mode-level-slider__summary-icon"
						aria-hidden="true"
					>
						<Icon icon={ previewed.icon } size={ 24 } />
					</span>
					<VStack spacing={ 2 }>
						<HStack spacing={ 2 } alignment="baseline" justify="flex-start">
							<Heading level={ 3 } size={ 16 } weight={ 600 }>
								{ previewed.label }
							</Heading>
							{ hovered && hovered !== value && (
								<Text
									variant="muted"
									size={ 12 }
									className="game-mode-level-slider__preview-tag"
								>
									{ __( 'preview', 'game-mode' ) }
								</Text>
							) }
						</HStack>
						<Text size={ 13 } weight={ 500 }>
							{ previewed.tagline }
						</Text>
						<Text variant="muted" size={ 13 }>
							{ previewed.description }
						</Text>
						{ previewed.changes?.length > 0 && (
							<ul className="game-mode-level-slider__changes">
								{ previewed.changes.map( ( change ) => (
									<li key={ change }>{ change }</li>
								) ) }
							</ul>
						) }
					</VStack>
				</HStack>
			</div>
		</VStack>
	);
}
