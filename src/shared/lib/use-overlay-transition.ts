import { useEffect, useState } from 'react';

/**
 * Drives enter/exit transitions for overlays that would otherwise pop in and out
 * with their `open` prop.
 *
 * `mounted` keeps the markup in the DOM until the exit transition has run;
 * `shown` picks the open vs. closed classes and is flipped a frame after mount so
 * the browser has a closed state to animate away from.
 */
export function useOverlayTransition(open: boolean, ms = 200) {
	const [mounted, setMounted] = useState(open);
	const [shown, setShown] = useState(false);

	// Adjusting state during render (React's own pattern) rather than in an effect:
	// the overlay is in the DOM in the same commit that opens it, so focus and the
	// entry transition are never a frame late.
	if (open && !mounted) setMounted(true);
	if (!open && shown) setShown(false);

	useEffect(() => {
		if (!open) {
			const t = setTimeout(() => setMounted(false), ms);
			return () => clearTimeout(t);
		}
		// Two frames: the first paints the closed state, the second transitions off it.
		let inner = 0;
		const outer = requestAnimationFrame(() => {
			inner = requestAnimationFrame(() => setShown(true));
		});
		return () => {
			cancelAnimationFrame(outer);
			cancelAnimationFrame(inner);
		};
	}, [open, ms]);

	return { mounted, shown };
}
