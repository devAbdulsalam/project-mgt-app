import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface TabItem<K extends string = string> {
	key: K;
	label: ReactNode;
	count?: number;
}

/** Pill-style status tabs from the ticket table design. */
export function PillTabs<K extends string>({ items, value, onChange, className, ariaLabel }: { items: TabItem<K>[]; value: K; onChange: (k: K) => void; className?: string; ariaLabel?: string }) {
	return (
		<div role="tablist" aria-label={ariaLabel} className={cn('flex items-center gap-1 overflow-x-auto', className)}>
			{items.map((it) => {
				const active = it.key === value;
				return (
					<button
						key={it.key}
						role="tab"
						type="button"
						aria-selected={active}
						onClick={() => onChange(it.key)}
						className={cn(
							'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-[7px] text-[13px] font-medium whitespace-nowrap transition-colors',
							active ? 'bg-brand-900 text-white' : 'text-t2 hover:bg-muted hover:text-t1',
						)}
					>
						{it.label}
						{it.count != null ? <i className={cn('not-italic rounded-full px-[7px] py-px text-[11px]', active ? 'bg-white/20 text-white' : 'bg-muted text-t2')}>{it.count}</i> : null}
					</button>
				);
			})}
		</div>
	);
}

/** Underlined tabs from the ticket detail / project overview designs. */
export function LineTabs<K extends string>({ items, value, onChange, className, ariaLabel, size = 'md' }: { items: TabItem<K>[]; value: K; onChange: (k: K) => void; className?: string; ariaLabel?: string; size?: 'sm' | 'md' }) {
	return (
		<div role="tablist" aria-label={ariaLabel} className={cn('flex items-center gap-5 overflow-x-auto border-b border-border', className)}>
			{items.map((it) => {
				const active = it.key === value;
				return (
					<button
						key={it.key}
						role="tab"
						type="button"
						aria-selected={active}
						onClick={() => onChange(it.key)}
						className={cn(
							'-mb-px flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 whitespace-nowrap transition-colors',
							size === 'sm' ? 'text-[13px]' : 'text-sm',
							active ? 'border-brand-900 font-semibold text-t1' : 'border-transparent text-t2 hover:text-t1',
						)}
					>
						{it.label}
						{it.count != null ? <span className="text-xs text-t3">{it.count}</span> : null}
					</button>
				);
			})}
		</div>
	);
}

/** Dark mobile chip tabs (as on mobile list headers). */
export function DarkChips<K extends string>({ items, value, onChange, className }: { items: TabItem<K>[]; value: K; onChange: (k: K) => void; className?: string }) {
	return (
		<div className={cn('-mx-4 flex gap-2 overflow-x-auto px-4 pb-1', className)} role="tablist">
			{items.map((it) => {
				const active = it.key === value;
				return (
					<button
						key={it.key}
						role="tab"
						aria-selected={active}
						type="button"
						onClick={() => onChange(it.key)}
						className={cn('flex h-[34px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] whitespace-nowrap', active ? 'bg-white font-semibold text-brand-900' : 'bg-brand-800 text-white')}
					>
						{it.label}
						{it.count != null ? <span className={active ? 'text-brand-700' : 'text-on-dark-muted'}>{it.count}</span> : null}
					</button>
				);
			})}
		</div>
	);
}
