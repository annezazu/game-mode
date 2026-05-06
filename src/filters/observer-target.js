/**
 * Pick the smallest stable DOM container we can plausibly observe instead of
 * `document.body`. Each game-mode filter only cares about a slice of the
 * editor — the sidebar, the inserter, the inspector — and observing the full
 * body subtree means every keystroke in the canvas iframe fires a mutation
 * we then ignore. Cheap to dispatch but adds up across five observers.
 *
 * Preferred targets, by selector. First match wins. If none of these exist
 * yet we fall back to `document.body` so first-paint observers still mount;
 * once the sidebar mounts the next call to `getObserverTarget()` returns
 * the real container.
 */

const TARGET_SELECTORS = [
	// Site Editor primary sidebar (block inspector + global styles).
	'.interface-interface-skeleton__sidebar',
	// Inserter / list-view secondary sidebar.
	'.interface-interface-skeleton__secondary-sidebar',
	// Editor body — narrower than document.body but still wide enough.
	'.interface-interface-skeleton__body',
];

export function getObserverTarget() {
	if ( typeof document === 'undefined' ) {
		return null;
	}
	for ( const sel of TARGET_SELECTORS ) {
		const el = document.querySelector( sel );
		if ( el ) {
			return el;
		}
	}
	return document.body;
}
