import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Reveal } from './Reveal';

export function CtaLink({ children = 'Get Started', className }: { children?: ReactNode; className?: string }) {
	return (
		<Link to="/signup" className={cn('inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 transition-colors hover:text-brand-900', className)}>
			{children}
			<ArrowUpRight size={15} aria-hidden />
		</Link>
	);
}

/** Two-column section heading: title + CTA on the left, supporting copy on the right. */
export function SectionHeader({ title, children, cta = true, className }: { title: ReactNode; children?: ReactNode; cta?: boolean; className?: string }) {
	return (
		<div className={cn('grid items-end gap-5 md:grid-cols-[1fr_minmax(0,400px)] md:gap-12', className)}>
			<div>
				<Reveal as="h2" className="text-[28px] leading-[1.12] font-semibold tracking-[-0.02em] text-t1 sm:text-[34px] lg:text-[38px]">
					{title}
				</Reveal>
				{cta ? (
					<Reveal delay={100} className="mt-4">
						<CtaLink />
					</Reveal>
				) : null}
			</div>
			{children ? (
				<Reveal as="p" delay={150} className="text-[14px] leading-relaxed text-t2 md:pb-1">
					{children}
				</Reveal>
			) : null}
		</div>
	);
}
