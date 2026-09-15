import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { useParallax } from '../hooks/useParallax';

/** A parallax layer. Positive speed lags behind the page (background), negative runs ahead (foreground). */
export function Parallax({ speed, className, children, style }: { speed?: number; className?: string; children?: ReactNode; style?: CSSProperties }) {
	const ref = useParallax<HTMLDivElement>(speed);
	return (
		<div ref={ref} className={cn('plx', className)} style={style}>
			{children}
		</div>
	);
}
