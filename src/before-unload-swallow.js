/**
 * Suppress WP's "unsaved changes" beforeunload dialog on our own intentional
 * page reload during a level switch.
 *
 * Why this exists as its own module: the listener has to register *before*
 * WP's `UnsavedChangesWarning` mounts. Listeners on `window` fire in
 * registration order regardless of `capture`, so we have to win the race at
 * module load — late registration in `performSwitch` is too late, and
 * `stopImmediatePropagation` can't help once WP's handler has already set
 * `event.returnValue` (which is what Chrome reads to show the native dialog).
 *
 * Lives outside index.js so the swallow logic is testable in isolation.
 */

const FLAG = '__gameModeSuppressBeforeUnload';

/**
 * Install the swallowing listener on the given window. Idempotent — calling
 * twice on the same window doesn't double-register.
 *
 * @param {Window} win Target window (defaults to global `window`).
 */
export function installBeforeUnloadSwallow( win = window ) {
	if ( win[ FLAG + '_installed' ] ) {
		return;
	}
	win[ FLAG + '_installed' ] = true;
	win[ FLAG ] = false;
	win.addEventListener(
		'beforeunload',
		( e ) => {
			if ( win[ FLAG ] ) {
				e.stopImmediatePropagation();
				delete e.returnValue;
			}
		},
		{ capture: true }
	);
}

/**
 * Flip the flag the listener watches so the next beforeunload (i.e. the one
 * fired by our `window.location.reload()`) is swallowed.
 *
 * @param {Window} win Target window (defaults to global `window`).
 */
export function armBeforeUnloadSwallow( win = window ) {
	win[ FLAG ] = true;
}
