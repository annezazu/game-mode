import {
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	__experimentalVStack as VStack,
	__experimentalHStack as HStack,
	__experimentalText as Text,
	__experimentalHeading as Heading,
	Icon,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import { LEVELS, LEVEL_KEYS } from '../levels';

/**
 * Segmented-control level picker built on ToggleGroupControl.
 *
 * The summary card below always reflects the *committed* selection —
 * hovering a segment doesn't preview its details. Users have to click
 * a segment to see its summary, which encourages an intentional pick.
 */
export default function LevelSegmented( { value, onChange } ) {
	const selectedKey = value ?? LEVEL_KEYS[ 0 ];
	const selected = LEVELS[ selectedKey ];

	return (
		<VStack spacing={ 5 }>
			<div
				className="game-mode-level-segmented"
				style={ { '--game-mode-accent': selected.accent } }
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
							/>
						);
					} ) }
				</ToggleGroupControl>
			</div>

			<div
				className="game-mode-level-segmented__summary"
				style={ { '--game-mode-accent': selected.accent } }
				aria-live="polite"
			>
				<HStack spacing={ 4 } alignment="flex-start">
					<span
						className="game-mode-level-segmented__summary-icon"
						aria-hidden="true"
					>
						<Icon icon={ selected.icon } size={ 24 } />
					</span>
					<VStack spacing={ 2 }>
						<Heading level={ 3 } size={ 16 } weight={ 600 }>
							{ selected.label }
						</Heading>
						<Text size={ 13 } weight={ 500 }>
							{ selected.tagline }
						</Text>
						<Text variant="muted" size={ 13 }>
							{ selected.description }
						</Text>
						{ selected.changes?.length > 0 && (
							<ul className="game-mode-level-segmented__changes">
								{ selected.changes.map( ( change ) => (
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
