import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type Variant = 'up' | 'left' | 'right' | 'scale' | 'fade';
type Tag = 'div' | 'section' | 'article' | 'ul' | 'li' | 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'figure' | 'footer';

const variantClass: Record<Variant, string> = { up: '', left: 'reveal-left', right: 'reveal-right', scale: 'reveal-scale', fade: 'reveal-fade' };

/** One observer for every revealed element on the page; each element is revealed once and then released. */
let observer: IntersectionObserver | undefined;
function observe(el: Element) {
	observer ??= new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (e.isIntersecting) {
					e.target.setAttribute('data-in', 'true');
					observer?.unobserve(e.target);
				}
			}
		},
		{ rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
	);
	observer.observe(el);
	return () => observer?.unobserve(el);
}

export interface RevealProps {
	as?: Tag;
	variant?: Variant;
	/** Stagger, in ms. */
	delay?: number;
	id?: string;
	className?: string;
	style?: CSSProperties;
	children?: ReactNode;
	'aria-label'?: string;
}

/** Fades and slides its content in the first time it scrolls into view. */
export function Reveal({ as = 'div', variant = 'up', delay = 0, className, style, children, ...rest }: RevealProps) {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		return observe(el);
	}, []);
	// Rendered tag is dynamic; the element type only affects semantics, never the props we pass.
	const Element = as as 'div';
	return (
		<Element ref={ref} className={cn('reveal', variantClass[variant], className)} style={{ '--d': `${delay}ms`, ...style } as CSSProperties} {...rest}>
			{children}
		</Element>
	);
}
