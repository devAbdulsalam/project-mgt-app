import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export const container = 'mx-auto w-full max-w-[1180px] px-5 sm:px-8';

/** Chat-style message bubble used in testimonial cards. */
export function Bubble({ children, side = 'left', dark, className }: { children: ReactNode; side?: 'left' | 'right'; dark?: boolean; className?: string }) {
	return (
		<div
			className={cn(
				'max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug',
				side === 'left' ? 'self-start rounded-bl-md' : 'self-end rounded-br-md',
				dark ? (side === 'left' ? 'bg-white/12 text-white' : 'bg-white text-t1') : side === 'left' ? 'bg-white text-t1 shadow-card' : 'bg-brand-100 text-brand-900',
				className,
			)}
		>
			{children}
		</div>
	);
}

/** Small floating label chip. */
export function Tag({ children, tone = 'teal', className, style }: { children: ReactNode; tone?: 'teal' | 'green' | 'tan' | 'lavender'; className?: string; style?: CSSProperties }) {
	const tones = {
		teal: 'bg-brand-100 text-brand-900',
		green: 'bg-green-bg text-green-fg',
		tan: 'bg-tan-bg text-tan-fg',
		lavender: 'bg-lavender-bg text-lavender-fg',
	};
	return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium whitespace-nowrap shadow-card', tones[tone], className)} style={style}>{children}</span>;
}
