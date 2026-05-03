import { isThemeBlock } from './theme-blocks-inserter';

describe( 'isThemeBlock', () => {
	it( 'matches blocks in the theme category', () => {
		expect( isThemeBlock( 'core/cover', 'theme' ) ).toBe( true );
	} );

	it( 'matches post-* blocks', () => {
		expect( isThemeBlock( 'core/post-title', 'design' ) ).toBe( true );
		expect( isThemeBlock( 'core/post-content', 'design' ) ).toBe( true );
	} );

	it( 'matches site-* blocks and template-part', () => {
		expect( isThemeBlock( 'core/site-title', 'design' ) ).toBe( true );
		expect( isThemeBlock( 'core/template-part', 'design' ) ).toBe( true );
	} );

	it( 'matches navigation and query', () => {
		expect( isThemeBlock( 'core/navigation', 'design' ) ).toBe( true );
		expect( isThemeBlock( 'core/query', 'design' ) ).toBe( true );
		expect( isThemeBlock( 'core/query-pagination', 'design' ) ).toBe( true );
	} );

	it( 'does not match plain content blocks', () => {
		expect( isThemeBlock( 'core/paragraph', 'text' ) ).toBe( false );
		expect( isThemeBlock( 'core/heading', 'text' ) ).toBe( false );
		expect( isThemeBlock( 'core/image', 'media' ) ).toBe( false );
	} );
} );
