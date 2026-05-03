import {
	Modal,
	Button,
	__experimentalVStack as VStack,
	__experimentalHStack as HStack,
	__experimentalText as Text,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import { LEVELS } from '../levels';
import LevelCard from './LevelCard';

/**
 * @param {Object}   props
 * @param {string|null} props.currentLevel  Active level, if any.
 * @param {boolean}  props.isFirstRun       True when no level has been picked yet.
 *                                          When true, the modal blocks until chosen.
 * @param {Function} props.onConfirm        Called with the chosen level key.
 * @param {Function} props.onClose          Called when the user dismisses (only
 *                                          available when !isFirstRun).
 */
export default function LevelPickerModal( {
	currentLevel,
	isFirstRun,
	onConfirm,
	onClose,
} ) {
	const [ pending, setPending ] = useState( currentLevel );

	const blocking = isFirstRun;

	return (
		<Modal
			title={ __( 'Choose your difficulty', 'game-mode' ) }
			onRequestClose={ blocking ? () => {} : onClose }
			isDismissible={ ! blocking }
			shouldCloseOnClickOutside={ ! blocking }
			shouldCloseOnEsc={ ! blocking }
			className="game-mode-picker-modal"
			size="medium"
		>
			<VStack spacing={ 4 }>
				<Text size={ 14 } as="p" className="game-mode-picker-modal__intro">
					{ __(
						'Pick the experience that matches what you want to do today. You can switch any time from the bottom-right corner — different modes are useful for different tasks.',
						'game-mode'
					) }
				</Text>
				<div role="radiogroup" aria-label={ __( 'Difficulty level', 'game-mode' ) }>
					<VStack spacing={ 3 }>
						{ Object.values( LEVELS ).map( ( level ) => (
							<LevelCard
								key={ level.key }
								level={ level }
								isSelected={ pending === level.key }
								onSelect={ setPending }
							/>
						) ) }
					</VStack>
				</div>
				<HStack justify="flex-end" spacing={ 2 }>
					{ ! blocking && (
						<Button variant="tertiary" onClick={ onClose }>
							{ __( 'Cancel', 'game-mode' ) }
						</Button>
					) }
					<Button
						variant="primary"
						disabled={ ! pending || pending === currentLevel }
						onClick={ () => pending && onConfirm( pending ) }
					>
						{ blocking
							? __( 'Start exploring', 'game-mode' )
							: __( 'Switch level', 'game-mode' ) }
					</Button>
				</HStack>
			</VStack>
		</Modal>
	);
}
