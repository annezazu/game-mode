import {
	__experimentalVStack as VStack,
	__experimentalHStack as HStack,
	__experimentalText as Text,
	__experimentalHeading as Heading,
	Icon,
} from '@wordpress/components';
import { useState, useRef, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import { LEVELS, LEVEL_KEYS } from '../levels';

/**
 * Slider-style level picker.
 *
 * - Click or arrow-key a stop to commit a selection (drives `value`).
 * - Hover/focus a stop to preview that level's summary without committing.
 * - The summary panel below reflects the previewed level, falling back to
 *   the committed selection when nothing is hovered.
 */
export default function LevelSlider( { value, onChange } ) {
	const [ hovered, setHovered ] = useState( null );
	const stops = LEVEL_KEYS;
	const stopRefs = useRef( {} );

	const lastValueRef = useRef( value );
	useEffect( () => {
		if ( lastValueRef.current !== value ) {
			stopRefs.current[ value ]?.focus();
			lastValueRef.current = value;
		}
	}, [ value ] );

	const previewedKey = hovered ?? value ?? stops[ 0 ];
	const previewed = LEVELS[ previewedKey ];

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
				className="game-mode-level-slider"
				role="radiogroup"
				aria-label={ __( 'Difficulty level', 'game-mode' ) }
				style={ { '--game-mode-accent': previewed.accent } }
			>
				<div className="game-mode-level-slider__track" aria-hidden="true">
					<div
						className="game-mode-level-slider__fill"
						style={ { width: `${ fillPercent }%` } }
					/>
				</div>
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

			<div
				className="game-mode-level-slider__summary"
				style={ { '--game-mode-accent': previewed.accent } }
				aria-live="polite"
			>
				<HStack spacing={ 3 } alignment="flex-start">
					<span
						className="game-mode-level-slider__summary-icon"
						aria-hidden="true"
					>
						<Icon icon={ previewed.icon } size={ 24 } />
					</span>
					<VStack spacing={ 2 }>
						<Heading level={ 3 } size={ 16 } weight={ 600 }>
							{ previewed.label }
							{ hovered && hovered !== value && (
								<Text
									variant="muted"
									size={ 12 }
									className="game-mode-level-slider__preview-tag"
								>
									{ ' ' }
									{ __( '— preview', 'game-mode' ) }
								</Text>
							) }
						</Heading>
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
