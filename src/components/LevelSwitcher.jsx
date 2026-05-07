import {
	Dropdown,
	MenuGroup,
	MenuItem,
	Icon,
	__unstableMotion as motion,
	__unstableAnimatePresence as AnimatePresence,
} from '@wordpress/components';
import { useReducedMotion } from '@wordpress/compose';
import { __, sprintf } from '@wordpress/i18n';
import { check } from '@wordpress/icons';

import { LEVELS } from '../levels';

export default function LevelSwitcher( { level, onChange, onOpenPicker } ) {
	const reducedMotion = useReducedMotion();
	const config = LEVELS[ level ];
	if ( ! config ) {
		return null;
	}

	const renderToggle = ( { isOpen, onToggle } ) => (
		<button
			type="button"
			className="game-mode-switcher__toggle"
			aria-haspopup="menu"
			aria-expanded={ isOpen }
			aria-label={ sprintf(
				/* translators: %s: current level label */
				__( 'Game mode: %s', 'game-mode' ),
				config.label
			) }
			onClick={ onToggle }
		>
			<AnimatePresence mode="wait" initial={ false }>
				<motion.span
					key={ level }
					className="game-mode-switcher__icon"
					initial={
						reducedMotion
							? { opacity: 1 }
							: { opacity: 0, scale: 0.6 }
					}
					animate={ { opacity: 1, scale: 1 } }
					exit={
						reducedMotion
							? { opacity: 0 }
							: { opacity: 0, scale: 0.6 }
					}
					transition={ { duration: reducedMotion ? 0 : 0.2 } }
					aria-hidden="true"
				>
					<Icon icon={ config.icon } size={ 20 } />
				</motion.span>
			</AnimatePresence>
			<motion.span
				key={ `${ level }-label` }
				className="game-mode-switcher__label"
				initial={ reducedMotion ? false : { opacity: 0, x: -6 } }
				animate={ { opacity: 1, x: 0 } }
				transition={ {
					duration: reducedMotion ? 0 : 0.2,
					delay: 0.05,
				} }
			>
				{ config.label }
			</motion.span>
		</button>
	);

	return (
		<div
			className="game-mode-switcher"
			role="region"
			aria-label={ __( 'Game mode', 'game-mode' ) }
			style={ { '--game-mode-accent': config.accent } }
		>
			<span
				className="game-mode-switcher__grip"
				aria-hidden="true"
				title={ __( 'Drag to move', 'game-mode' ) }
			>
				<svg
					width="10"
					height="16"
					viewBox="0 0 10 16"
					focusable="false"
				>
					<circle cx="2" cy="3" r="1.2" />
					<circle cx="8" cy="3" r="1.2" />
					<circle cx="2" cy="8" r="1.2" />
					<circle cx="8" cy="8" r="1.2" />
					<circle cx="2" cy="13" r="1.2" />
					<circle cx="8" cy="13" r="1.2" />
				</svg>
			</span>
			<Dropdown
				popoverProps={ { placement: 'top-end', offset: 8 } }
				renderToggle={ renderToggle }
				renderContent={ ( { onClose } ) => (
					<>
						<MenuGroup label={ __( 'Difficulty', 'game-mode' ) }>
							{ Object.values( LEVELS ).map( ( option ) => {
								const selected = option.key === level;
								return (
									<MenuItem
										key={ option.key }
										icon={ option.icon }
										iconPosition="left"
										isSelected={ selected }
										role="menuitemradio"
										suffix={
											selected ? (
												<Icon icon={ check } />
											) : null
										}
										onClick={ () => {
											onClose();
											if ( ! selected ) {
												onChange( option.key );
											}
										} }
									>
										{ option.label }
									</MenuItem>
								);
							} ) }
						</MenuGroup>
						<MenuGroup>
							<MenuItem
								onClick={ () => {
									onClose();
									onOpenPicker();
								} }
							>
								{ __( 'Show details…', 'game-mode' ) }
							</MenuItem>
						</MenuGroup>
					</>
				) }
			/>
		</div>
	);
}
