// Small presentational pieces the console's list screens share.
//
// Kept together because they are all the same idea: a list of things with a
// search box, a row of actions, and a page control. Every one of them is
// deliberately plain — an operator screen is a tool for reading state and
// changing it carefully, and decoration is budget better spent on making the
// destructive action obvious.

import type { ReactNode } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Button, Card } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';

export function PageHeader({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
	return (
		<div className="mb-5 flex flex-wrap items-start justify-between gap-3">
			<div className="min-w-0">
				<h1 className="text-xl font-semibold text-t1">{title}</h1>
				{sub ? <p className="mt-1 max-w-[68ch] text-[13px] leading-relaxed text-t2">{sub}</p> : null}
			</div>
			{action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
		</div>
	);
}

/**
 * The search box.
 *
 * Debounced by the caller through the URL: this writes into the route's search
 * params, so a search is a real navigation — shareable, bookmarkable, and
 * surviving a reload. That is worth the extra keystroke of debouncing over a
 * local `useState` that vanishes on refresh.
 */
export function SearchBox({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean }) {
	return (
		<div className="relative w-full max-w-[320px]">
			<Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-t3" aria-hidden />
			<input
				type="search"
				value={value}
				autoFocus={autoFocus}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				aria-label={placeholder}
				className="input pl-9"
			/>
		</div>
	);
}

export function LoadingRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
	return (
		<>
			{Array.from({ length: rows }, (_, r) => (
				<tr key={r}>
					{Array.from({ length: cols }, (_, c) => (
						<td key={c} className="px-4 py-3.5">
							<span className="block h-3 animate-pulse rounded-sm bg-muted" style={{ width: `${45 + ((r * 7 + c * 13) % 45)}%` }} />
						</td>
					))}
				</tr>
			))}
		</>
	);
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
	return (
		<div className="grid place-items-center px-6 py-14 text-center">
			<p className="text-sm font-semibold text-danger">{message}</p>
			{onRetry ? (
				<Button variant="secondary" className="mt-3" onClick={onRetry}>
					Try again
				</Button>
			) : null}
		</div>
	);
}

// -- Table primitives ---------------------------------------------------------

export function TableShell({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<Card className={cn('overflow-hidden p-0', className)}>
			<div className="overflow-x-auto">{children}</div>
		</Card>
	);
}

export function Th({ children, align = 'left', className }: { children: ReactNode; align?: 'left' | 'right'; className?: string }) {
	return (
		<th scope="col" className={cn('border-b border-border bg-muted/50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-t2', align === 'right' ? 'text-right' : 'text-left', className)}>
			{children}
		</th>
	);
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
	return <td className={cn('px-4 py-3 align-middle text-[13px] text-t1', className)}>{children}</td>;
}

export function Row({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
	if (!onClick) return <tr className={cn('border-b border-border last:border-0', className)}>{children}</tr>;
	return (
		<tr
			onClick={onClick}
			className={cn('cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/60', className)}
		>
			{children}
		</tr>
	);
}

/** A definition row for the detail panels. */
export function Detail({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 last:border-0">
			<dt className="shrink-0 text-xs text-t2">{label}</dt>
			<dd className="min-w-0 text-right text-[13px] text-t1">{children}</dd>
		</div>
	);
}

export function Pending({ label }: { label: string }) {
	return (
		<span className="flex items-center gap-2 text-xs text-t2">
			<Loader2 className="animate-spin" size={13} aria-hidden />
			{label}
		</span>
	);
}
