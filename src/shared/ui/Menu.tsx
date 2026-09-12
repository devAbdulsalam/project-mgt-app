import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface MenuItem {
	key: string;
	label: ReactNode;
	icon?: ReactNode;
	hint?: ReactNode;
	disabled?: boolean;
	danger?: boolean;
	selected?: boolean;
	onSelect?: () => void;
}

/**
 * Lightweight dropdown menu. `trigger` receives open state and toggles; items render in a popover
 * anchored to the trigger. Closes on outside click and Escape.
 */
export function Menu({ trigger, items, align = 'start', className, width = 'w-56', header }: { trigger: (props: { open: boolean; toggle: () => void; buttonProps: Record<string, unknown> }) => ReactNode; items: MenuItem[]; align?: 'start' | 'end'; className?: string; width?: string; header?: ReactNode }) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const id = useId();

	useEffect(() => {
		if (!open) return;
		const onDoc = (e: MouseEvent) => {
			if (!ref.current?.contains(e.target as Node)) setOpen(false);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false);
		};
		document.addEventListener('mousedown', onDoc);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDoc);
			document.removeEventListener('keydown', onKey);
		};
	}, [open]);

	return (
		<div ref={ref} className={cn('relative inline-block', className)}>
			{trigger({ open, toggle: () => setOpen((o) => !o), buttonProps: { 'aria-haspopup': 'menu', 'aria-expanded': open, 'aria-controls': id } })}
			{open ? (
				<div id={id} role="menu" className={cn('absolute top-full z-40 mt-1 max-h-80 overflow-y-auto rounded-[10px] border border-border bg-white p-1 shadow-pop', width, align === 'end' ? 'right-0' : 'left-0')}>
					{header ? <div className="px-2.5 py-1.5 text-[11px] font-semibold tracking-wider text-t3 uppercase">{header}</div> : null}
					{items.length === 0 ? <div className="px-2.5 py-2 text-xs text-t3">Nothing here</div> : null}
					{items.map((it) => (
						<button
							key={it.key}
							role="menuitem"
							type="button"
							disabled={it.disabled}
							onClick={() => {
								it.onSelect?.();
								setOpen(false);
							}}
							className={cn(
								'flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-[13px] hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50',
								it.danger && 'text-danger-fg hover:bg-danger-bg',
								it.selected && 'bg-brand-100 font-semibold text-brand-900 hover:bg-brand-100',
							)}
						>
							{it.icon ? <span className="flex shrink-0 text-t2">{it.icon}</span> : null}
							<span className="min-w-0 flex-1 truncate">{it.label}</span>
							{it.hint ? <span className="text-[11px] text-t3">{it.hint}</span> : null}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}
