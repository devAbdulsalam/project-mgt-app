import { forwardRef, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from './Button';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea({ className, invalid, ...rest }, ref) {
	return <textarea ref={ref} aria-invalid={invalid || undefined} className={cn('input h-auto min-h-[96px] resize-y py-2.5 leading-relaxed', className)} {...rest} />;
});

export function EmptyState({ icon, title, children, action, className }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
	return (
		<div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
			{icon ? <span className="mb-3 grid size-11 place-items-center rounded-full bg-brand-100 text-brand-900">{icon}</span> : null}
			<h3 className="text-sm font-semibold">{title}</h3>
			{children ? <p className="mt-1 max-w-sm text-[13px] text-t2">{children}</p> : null}
			{action ? <div className="mt-4">{action}</div> : null}
		</div>
	);
}

export function Pagination({ page, pageCount, onChange, total, pageSize, className }: { page: number; pageCount: number; onChange: (p: number) => void; total: number; pageSize: number; className?: string }) {
	if (total === 0) return null;
	const from = (page - 1) * pageSize + 1;
	const to = Math.min(total, page * pageSize);
	const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1);
	return (
		<nav className={cn('flex flex-wrap items-center justify-between gap-3 text-[13px] text-t2', className)} aria-label="Pagination">
			<span>
				Showing {from}–{to} of {total}
			</span>
			<div className="flex items-center gap-1.5">
				<Button size="sm" iconOnly onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
					<ChevronLeft size={14} />
				</Button>
				{pages.map((p, i) => (
					<span key={p} className="contents">
						{i > 0 && pages[i - 1] !== p - 1 ? <span className="px-1 text-t3">…</span> : null}
						<Button size="sm" iconOnly variant={p === page ? 'primary' : 'secondary'} onClick={() => onChange(p)} aria-current={p === page ? 'page' : undefined}>
							{p}
						</Button>
					</span>
				))}
				<Button size="sm" iconOnly onClick={() => onChange(page + 1)} disabled={page >= pageCount} aria-label="Next page">
					<ChevronRight size={14} />
				</Button>
			</div>
		</nav>
	);
}

export function Kbd({ children }: { children: ReactNode }) {
	return <kbd className="kbd">{children}</kbd>;
}

export function SectionLabel({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
	return (
		<div className={cn('flex items-center justify-between', className)}>
			<h4 className="text-[11px] font-semibold tracking-wider text-t2 uppercase">{children}</h4>
			{action}
		</div>
	);
}

export function Switch({ on, onChange, label, size = 'md' }: { on: boolean; onChange: (v: boolean) => void; label: string; size?: 'sm' | 'md' }) {
	return (
		<button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cn('relative shrink-0 rounded-full transition-colors', size === 'sm' ? 'h-5 w-9' : 'h-6 w-11', on ? 'bg-brand-900' : 'bg-border-strong')}>
			<span className={cn('absolute top-0.5 rounded-full bg-white shadow transition-[left]', size === 'sm' ? 'size-4' : 'size-5', on ? (size === 'sm' ? 'left-[18px]' : 'left-[22px]') : 'left-0.5')} />
		</button>
	);
}

export function StatTile({ label, value, sub, subTone, className }: { label: ReactNode; value: ReactNode; sub?: ReactNode; subTone?: 'good' | 'bad' | 'muted'; className?: string }) {
	return (
		<div className={cn('card p-5', className)}>
			<div className="text-[11px] font-semibold tracking-wider text-t2 uppercase">{label}</div>
			<div className="tabular mt-3 text-[28px] leading-none font-semibold">{value}</div>
			{sub ? <div className={cn('mt-2.5 text-xs', subTone === 'good' ? 'text-success' : subTone === 'bad' ? 'text-high-fg' : 'text-t2')}>{sub}</div> : null}
		</div>
	);
}
