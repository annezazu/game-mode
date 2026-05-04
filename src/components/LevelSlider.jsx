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

	const stopFromClientX = useCallback(
		( clientX ) => {
			const track = trackRef.current;
			if ( ! track ) {
				return value;
			}
			const rect = track.getBoundingClientRect();
			const ratio = Math.max(
				0,
				Math.min( 1, ( clientX - rect.left ) / rect.width )
			);
			const idx = Math.round( ratio * ( stops.length - 1 ) );
			return stops[ idx ];
		},
		[ stops, value ]
	);

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
		const next = stopFromClientX( e.clientX );
		if ( next !== value ) {
			onChange( next );
		}
	};

	const handlePointerMove = ( e ) => {
		if ( ! isDragging ) {
			return;
		}
		const next = stopFromClientX( e.clientX );
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
			onChange( stops[ Math.min( idx + 1, stops.length - 1 ) ] );
		} else if ( e.key === 'ArrowLeft' || e.key === 'ArrowUp' ) {
			e.preventDefault();
			onChange( stops[ Math.max( idx - 1, 0 ) ] );
		} else if ( e.key === 'Home' ) {
			e.preventDefault();
			onChange( stops[ 0 ] );
		} else if ( e.key === 'End' ) {
			e.preventDefault();
			onChange( stops[ stops.length - 1 ] );
		} else if ( e.key === 'Enter' || e.key === ' ' ) {
			e.preventDefault();
			onChange( key );
		}
	};

	const selectedIdx = Math.max( 0, stops.indexOf( value ) );
	const fillPercent = ( selectedIdx / ( stops.length - 1 ) ) * 100;

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
					ref={ trackRef }
					className="game-mode-level-slider__track-area"
					onPointerDown={ handlePointerDown }
					onPointerMove={ handlePointerMove }
					onPointerUp={ handlePointerUp }
					onPointerCancel={ handlePointerUp }
				>
					<div className="game-mode-level-slider__track" aria-hidden="true">
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
					<div className="game-mode-level-slider__stops">
						{ stops.map( ( key ) => {
							const level = LEVELS[ key ];
							const isSelected = value === key;
							const isPreviewed = previewedKey === key;
							return (
								<button
									key={ key }
									type="button"
									ref={ ( el ) => ( stopRefs.current[ key ] = el ) }
									className={ `game-mode-level-slider__stop${
										isSelected ? ' is-selected' : ''
									}${ isPreviewed ? ' is-previewed' : '' }` }
									style={ { '--stop-accent': level.accent } }
									role="radio"
									aria-checked={ isSelected }
									tabIndex={
										isSelected || ( ! value && key === stops[ 0 ] )
											? 0
											: -1
									}
									onClick={ () => onChange( key ) }
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
