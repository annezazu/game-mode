/**
 * @jest-environment jsdom
 */

import {
	installBeforeUnloadSwallow,
	armBeforeUnloadSwallow,
} from './before-unload-swallow';

function makeWindow() {
	// Build a fresh, isolated EventTarget so each test starts clean.
	const win = new EventTarget();
	win.addEventListener = win.addEventListener.bind( win );
	win.removeEventListener = win.removeEventListener.bind( win );
	win.dispatchEvent = win.dispatchEvent.bind( win );
	return win;
}

function fireBeforeUnload( win ) {
	const event = new Event( 'beforeunload', { cancelable: true } );
	win.dispatchEvent( event );
	return event;
}

describe( 'beforeunload swallow', () => {
	it( 'lets WP-style listeners run when not armed', () => {
		const win = makeWindow();
		const wpListener = jest.fn();
		installBeforeUnloadSwallow( win );
		win.addEventListener( 'beforeunload', wpListener );

		fireBeforeUnload( win );

		expect( wpListener ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'suppresses WP-style listeners once armed', () => {
		const win = makeWindow();
		const wpListener = jest.fn();
		installBeforeUnloadSwallow( win );
		win.addEventListener( 'beforeunload', wpListener );

		armBeforeUnloadSwallow( win );
		fireBeforeUnload( win );

		// Our capture-phase listener calls `stopImmediatePropagation`, so
		// WP's listener never gets a chance to set `event.returnValue`.
		// Chrome only shows the native dialog if some listener sets it, so
		// "WP listener didn't run" == "no native dialog".
		expect( wpListener ).not.toHaveBeenCalled();
	} );

	it( 'is idempotent — installing twice still only registers one listener', () => {
		const win = makeWindow();
		const addSpy = jest.spyOn( win, 'addEventListener' );

		installBeforeUnloadSwallow( win );
		installBeforeUnloadSwallow( win );

		const beforeUnloadCalls = addSpy.mock.calls.filter(
			( [ name ] ) => name === 'beforeunload'
		);
		expect( beforeUnloadCalls ).toHaveLength( 1 );
	} );

	it( 'registers with capture: true', () => {
		const win = makeWindow();
		const addSpy = jest.spyOn( win, 'addEventListener' );

		installBeforeUnloadSwallow( win );

		const [ , , options ] = addSpy.mock.calls.find(
			( [ name ] ) => name === 'beforeunload'
		);
		expect( options ).toEqual( expect.objectContaining( { capture: true } ) );
	} );
} );
