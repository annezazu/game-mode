import {
	expandDefaultControls,
	SUPPORT_CONTROLS,
} from './block-supports';

describe( 'expandDefaultControls', () => {
	it( 'returns empty object when no supports', () => {
		expect( expandDefaultControls( null ) ).toEqual( {} );
		expect( expandDefaultControls( undefined ) ).toEqual( {} );
	} );

	it( 'enables every known typography control regardless of declared sub-keys', () => {
		const patch = expandDefaultControls( {
			typography: { fontSize: true },
		} );
		// All known typography controls should be flipped on.
		SUPPORT_CONTROLS.typography.forEach( ( control ) => {
			expect( patch.typography.__experimentalDefaultControls[ control ] ).toBe( true );
		} );
	} );

	it( 'covers every namespace when declared, with all controls enabled', () => {
		const supports = {
			typography: { fontSize: true },
			color: { text: true },
			spacing: { padding: true },
			dimensions: { minHeight: true },
			__experimentalBorder: { color: true },
			background: { backgroundImage: true },
			shadow: true,
			position: { sticky: true },
		};
		const patch = expandDefaultControls( supports );
		Object.entries( SUPPORT_CONTROLS ).forEach( ( [ ns, controls ] ) => {
			controls.forEach( ( control ) => {
				expect( patch[ ns ].__experimentalDefaultControls[ control ] ).toBe( true );
			} );
		} );
	} );

	it( 'preserves existing __experimentalDefaultControls', () => {
		const patch = expandDefaultControls( {
			typography: {
				fontSize: true,
				__experimentalDefaultControls: { customLegacy: true },
			},
		} );
		expect( patch.typography.__experimentalDefaultControls.customLegacy ).toBe( true );
		expect( patch.typography.__experimentalDefaultControls.fontSize ).toBe( true );
	} );

	it( 'skips namespaces that are not declared', () => {
		const patch = expandDefaultControls( { color: { text: true } } );
		expect( Object.keys( patch ) ).toEqual( [ 'color' ] );
	} );

	it( 'mapping table is non-empty for every namespace', () => {
		for ( const [ , controls ] of Object.entries( SUPPORT_CONTROLS ) ) {
			expect( controls.length ).toBeGreaterThan( 0 );
		}
	} );
} );
