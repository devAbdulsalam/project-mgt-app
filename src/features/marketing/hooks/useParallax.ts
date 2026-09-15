import { useEffect, useRef } from 'react';

/**
 * Subtle scroll parallax. Every registered element shares one passive scroll
 * listener and one requestAnimationFrame, and writes a `--plx` custom property
 * that `.plx` turns into a translateY. Positive speed lags behind the page
 * (background), negative speed runs ahead (foreground).
 *
 * Disabled for prefers-reduced-motion and below 768px, where the extra
 * layers cost more than they add.
 */
interface Item { el: HTMLElement; speed: number; y: number }

const MAX_OFFSET = 140;
const items = new Set<Item>();
let raf = 0;
let listening = false;

function frame() {
	raf = 0;
	const vh = window.innerHeight;
	const narrow = window.innerWidth < 768;
	for (const it of items) {
		if (narrow) {
			if (it.y !== 0) { it.y = 0; it.el.style.setProperty('--plx', '0px'); }
			continue;
		}
		const r = it.el.getBoundingClientRect();
		// Subtract our own current offset so the measurement is of the untransformed box.
		const centre = r.top - it.y + r.height / 2 - vh / 2;
		// Clamp so a very tall viewport (or an element far off-screen) never yields a wild offset.
		const y = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, Math.round(-centre * it.speed * 10) / 10));
		if (y !== it.y) { it.y = y; it.el.style.setProperty('--plx', `${y}px`); }
	}
}
function schedule() { if (!raf) raf = requestAnimationFrame(frame); }
function attach() {
	if (listening) return;
	listening = true;
	window.addEventListener('scroll', schedule, { passive: true });
	window.addEventListener('resize', schedule);
}
function detachIfIdle() {
	if (!listening || items.size) return;
	listening = false;
	window.removeEventListener('scroll', schedule);
	window.removeEventListener('resize', schedule);
	cancelAnimationFrame(raf);
	raf = 0;
}

export function useParallax<T extends HTMLElement = HTMLDivElement>(speed = 0.08) {
	const ref = useRef<T>(null);
	useEffect(() => {
		const el = ref.current;
		if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const item: Item = { el, speed, y: 0 };
		items.add(item);
		attach();
		schedule();
		return () => {
			items.delete(item);
			el.style.removeProperty('--plx');
			detachIfIdle();
		};
	}, [speed]);
	return ref;
}
