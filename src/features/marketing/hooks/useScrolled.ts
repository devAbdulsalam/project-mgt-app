import { useEffect, useRef } from 'react';

/** Sets `data-scrolled="true"` on the element once the window is scrolled past `threshold` px (sticky nav styling). */
export function useScrolled<T extends HTMLElement = HTMLElement>(threshold = 8) {
	const ref = useRef<T>(null);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const update = () => { el.dataset.scrolled = window.scrollY > threshold ? 'true' : 'false'; };
		update();
		window.addEventListener('scroll', update, { passive: true });
		return () => window.removeEventListener('scroll', update);
	}, [threshold]);
	return ref;
}
