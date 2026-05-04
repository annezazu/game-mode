import {
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	__experimentalVStack as VStack,
	__experimentalHStack as HStack,
	__experimentalText as Text,
	__experimentalHeading as Heading,
	Icon,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import { LEVELS, LEVEL_KEYS } from '../levels';

/**
 * Segmented-control level picker built on ToggleGroupControl.
 *
 * Hovering or focusing a segment previews the matching summary card
 * below. Clicking commits the selection.
 */
export default function LevelSegmented( { value, onChange } ) {
	const [ hovered, setHovered ] = useState( null );
	const previewedKey = hovered ?? value ?? LEVEL_KEYS[ 0 ];
	const previewed = LEVELS[ previewedKey ];

	return (
		<VStack spacing={ 5 }>
			<div
				className="game-mode-level-segmented"
				style={ { '--game-mode-accent': previewed.accent } }
			>
				<ToggleGroupControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					isBlock
					hideLabelFromVision
					label={ __( 'Difficulty level', 'game-mode' ) }
					value={ value }
					onChange={ ( next ) => onChange( next ) }
				>
					{ LEVEL_KEYS.map( ( key ) => {
						const level = LEVELS[ key ];
						return (
							<ToggleGroupControlOption
								key={ key }
								value={ key }
								label={ level.label }
								onMouseEnter={ () => setHovered( key ) }
								onMouseLeave={ () => setHovered( null ) }
								onFocus={ () => setHovered( key ) }
								onBlur={ () => setHovered( null ) }
							/>
						);
					} ) }
				</ToggleGroupControl>
			</div>

			<div
				className="game-mode-level-segmented__summary"
				style={ { '--game-mode-accent': previewed.accent } }
				aria-live="polite"
			>
				<HStack spacing={ 4 } alignment="flex-start">
					<span
						className="game-mode-level-segmented__summary-icon"
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
									className="game-mode-level-segmented__preview-tag"
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
							<ul className="game-mode-level-segmented__changes">
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
