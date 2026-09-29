import type { ReactNode } from 'react';
import { TicketWatermark, Wordmark } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { Link } from '@tanstack/react-router';
import smilingBg from '@/assets/smiling.jpg';

/**
 * Split auth layout: dark brand panel on the left (hidden below lg), form on the right.
 * `panel` is the marketing/left content, `children` the form.
 */
export function AuthShell({
	panel,
	children,
	wide,
	alignTop,
	footer,
	badge,
}: {
	panel: ReactNode;
	children: ReactNode;
	wide?: boolean;
	alignTop?: boolean;
	footer?: ReactNode;
	badge?: ReactNode;
}) {
	return (
		<div className="grid min-h-full lg:grid-cols-2">
			<aside
				className="relative hidden flex-col overflow-hidden p-12 text-white lg:flex xl:p-14"
				style={{
					backgroundImage: `linear-gradient(
					rgba(17, 13, 84, 0.7),
					rgba(34, 190, 106, 0.7)),
					url(${smilingBg})`,
					backgroundSize: 'cover',
					backgroundPosition: 'center',
				}}
			>
				<div className="flex items-center">
					<Link to="/" className="shrink-0" aria-label="Ledge Desk home">
						<Wordmark light={false} />
					</Link>
					{badge ? (
						<span className="ml-auto text-[11px]">
							{badge}
						</span>
					) : null}
				</div>
				<div className="mt-auto mb-8 max-w-[480px]">{panel}</div>
				<div className="text-[11px] ">
					{footer ?? '© 2026 Ledge Desk · NDPR compliant · SOC 2 Type II'}
				</div>
				<TicketWatermark />
			</aside>
			<main
				className={cn(
					'flex flex-col px-4 py-8 sm:px-10',
					alignTop ? 'lg:justify-start lg:pt-12' : 'lg:justify-center',
				)}
			>
				<div className="mb-8 flex justify-center lg:hidden">
					<Wordmark light={false} />
				</div>
				<div
					className={cn(
						'mx-auto w-full',
						wide ? 'max-w-[520px]' : 'max-w-[400px]',
					)}
				>
					{children}
				</div>
			</main>
		</div>
	);
}

export function PanelHeadline({
	title,
	children,
}: {
	title: ReactNode;
	children?: ReactNode;
}) {
	return (
		<>
			<h1 className="mb-3.5 text-[30px] leading-[1.2] font-semibold xl:text-[34px]">
				{title}
			</h1>
			{children ? (
				<p className="max-w-[420px] text-[15px] leading-relaxed text-on-dark-muted">
					{children}
				</p>
			) : null}
		</>
	);
}

export function PanelTile({
	value,
	label,
	icon,
	iconClass,
	className,
}: {
	value: ReactNode;
	label: string;
	icon?: ReactNode;
	iconClass?: string;
	className?: string;
}) {
	return (
		<div
			className={cn(
				'rounded-[14px] border border-white/60 bg-white/[.04] px-4.5 py-4',
				className,
			)}
		>
			<div className={cn('flex items-center gap-2', iconClass)}>
				{icon}
				<b className="text-[22px] text-white">{value}</b>
			</div>
			<div className="mt-1 text-[11px] text-on-dark-muted">{label}</div>
		</div>
	);
}
