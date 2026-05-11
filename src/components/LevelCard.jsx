import {
	Card,
	CardBody,
	__experimentalHStack as HStack,
	__experimentalVStack as VStack,
	__experimentalText as Text,
	__experimentalHeading as Heading,
	Icon,
} from '@wordpress/components';
import { check } from '@wordpress/icons';

export default function LevelCard( { level, isSelected, onSelect } ) {
	const labelId = `game-mode-level-${ level.key }-label`;
	const descId = `game-mode-level-${ level.key }-desc`;
	return (
		<Card
			isBorderless={ false }
			size="small"
			className={ `game-mode-level-card${ isSelected ? ' is-selected' : '' }` }
			onClick={ () => onSelect( level.key ) }
			onKeyDown={ ( e ) => {
				if ( e.key === 'Enter' || e.key === ' ' ) {
					e.preventDefault();
					onSelect( level.key );
				}
			} }
			role="radio"
			aria-checked={ isSelected }
			aria-labelledby={ labelId }
			aria-describedby={ descId }
			tabIndex={ 0 }
			style={ { '--game-mode-accent': level.accent } }
		>
			<CardBody>
				<VStack spacing={ 3 }>
					<HStack justify="space-between" alignment="center">
						<HStack spacing={ 2 } alignment="center" expanded={ false }>
							<span className="game-mode-level-card__icon" aria-hidden="true">
								<Icon icon={ level.icon } size={ 24 } />
							</span>
							<Heading level={ 3 } size={ 20 } weight={ 600 } id={ labelId }>
								{ level.label }
							</Heading>
						</HStack>
						{ isSelected && (
							<Icon
								icon={ check }
								size={ 20 }
								className="game-mode-level-card__check"
							/>
						) }
					</HStack>
					<Text size={ 14 } id={ descId }>
						{ level.tagline }
					</Text>
					{ Array.isArray( level.changes ) && level.changes.length > 0 && (
						<ul className="game-mode-level-card__changes" aria-hidden="true">
							{ level.changes.map( ( change, i ) => (
								<li key={ i }>
									<Icon
										icon={ check }
										size={ 16 }
										className="game-mode-level-card__changes-check"
									/>
									<span>{ change }</span>
								</li>
							) ) }
						</ul>
					) }
					<Text variant="muted" size={ 13 } aria-hidden="true">
						{ level.description }
					</Text>
				</VStack>
			</CardBody>
		</Card>
	);
}
