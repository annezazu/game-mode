import {
	minimizeSupports,
	expandDefaultControls,
	SUPPORT_CONTROLS,
} from './block-supports';

describe( 'minimizeSupports', () => {
	it( 'returns input unchanged when not an object', () => {
		expect( minimizeSupports( undefined ) ).toBe( undefined );
		expect( minimizeSupports( null ) ).toBe( null );
	} );

	it( 'keeps color and typography.fontSize, drops everything else', () => {
		const input = {
			color: { background: true, text: true, link: true },
			typography: { fontSize: true, lineHeight: true, fontFamily: true },
			spacing: { padding: true },
			__experimentalBorder: { color: true },
		};
		const out = minimizeSupports( input );
		expect( out.color ).toEqual( { background: true, text: true, link: true } );
		expect( out.typography ).toEqual( { fontSize: true } );
		expect( out.spacing ).toBeUndefined();
		expect( out.__experimentalBorder ).toBeUndefined();
	} );

	it( 'preserves infrastructure supports including layout/align', () => {
		const out = minimizeSupports( {
			anchor: true,
			className: true,
			html: false,
			inserter: false,
			multiple: false,
			reusable: false,
			align: [ 'wide', 'full' ],
			alignWide: true,
			layout: { allowEditing: false },
		} );
		expect( out ).toEqual( {
			anchor: true,
			className: true,
			html: false,
			inserter: false,
			multiple: false,
			reusable: false,
			align: [ 'wide', 'full' ],
			alignWide: true,
			layout: { allowEditing: false },
		} );
	} );

	it( 'composes with expandDefaultControls so Link color renders up-front', () => {
		// Issue #14: Link was hiding in the ToolsPanel "more" menu in easy mode.
		const minimized = minimizeSupports( {
			color: { background: true, text: true, link: true },
		} );
		const merged = { ...minimized, ...expandDefaultControls( minimized ) };
		expect( merged.color.__experimentalDefaultControls.link ).toBe( true );
		expect( merged.color.__experimentalDefaultControls.text ).toBe( true );
		expect( merged.color.__experimentalDefaultControls.background ).toBe( true );
	} );

	it( 'omits typography entirely when no fontSize support is declared', () => {
		const out = minimizeSupports( {
			typography: { lineHeight: true, fontFamily: true },
		} );
		expect( out.typography ).toBeUndefined();
	} );
} );

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
