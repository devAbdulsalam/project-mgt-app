import type { ReactNode } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/** Filter chip from the ticket table toolbar. Active chips render teal with a clear "×". */
export function FilterChip({ label, value, onClear, onClick, active, className, icon, buttonProps }: { label: string; value?: ReactNode; onClear?: () => void; onClick?: () => void; active?: boolean; className?: string; icon?: ReactNode; buttonProps?: Record<string, unknown> }) {
	const isActive = active ?? !!value;
	return (
		<span className={cn('inline-flex h-[30px] items-center overflow-hidden rounded-sm border text-xs', isActive ? 'border-brand-100 bg-brand-100 font-semibold text-brand-900' : 'border-border-strong bg-white text-t1', className)}>
			<button type="button" onClick={onClick} className="flex h-full items-center gap-1.5 px-3 hover:bg-black/5" {...buttonProps}>
				{icon}
				{label}
				{value ? <span className="max-w-[160px] truncate">: {value}</span> : null}
				{!isActive || !onClear ? <ChevronDown size={12} aria-hidden /> : null}
			</button>
			{isActive && onClear ? (
				<button type="button" onClick={onClear} className="flex h-full items-center pr-2.5 pl-0.5 hover:bg-black/5" aria-label={`Clear ${label} filter`}>
					<X size={12} />
				</button>
			) : null}
		</span>
	);
}

export function LabelChip({ children, onRemove, tone }: { children: ReactNode; onRemove?: () => void; tone?: number }) {
	const tones = ['bg-info-bg text-info-fg', 'bg-high-bg text-high-fg', 'bg-purple-bg text-purple-fg', 'bg-green-bg text-green-fg', 'bg-tan-bg text-tan-fg', 'bg-lavender-bg text-lavender-fg'];
	const t = tone ?? (typeof children === 'string' ? Math.abs([...children].reduce((a, c) => a + c.charCodeAt(0), 0)) % tones.length : 0);
	return (
		<span className={cn('inline-flex h-5 items-center gap-1 rounded-[6px] px-2 text-[11px] font-medium', tones[t])}>
			{children}
			{onRemove ? (
				<button type="button" onClick={onRemove} className="-mr-1 grid size-4 place-items-center rounded-full hover:bg-black/10" aria-label={`Remove label ${children}`}>
					<X size={10} />
				</button>
			) : null}
		</span>
	);
}
