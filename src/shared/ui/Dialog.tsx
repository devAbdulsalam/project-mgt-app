import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/**
 * Modal dialog rendered in a portal. Traps Escape, locks body scroll, restores focus on close.
 * On small screens it fills the viewport (full-page on mobile, per the plan).
 */
export function Dialog({ open, onClose, title, children, footer, width = 'max-w-[1100px]', header, className }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; width?: string; header?: ReactNode; className?: string }) {
	const panelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const prev = document.activeElement as HTMLElement | null;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', onKey);
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		const first = panelRef.current?.querySelector<HTMLElement>('input, textarea, select, button');
		first?.focus();
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = prevOverflow;
			prev?.focus?.();
		};
	}, [open, onClose]);

	if (!open) return null;

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-stretch justify-center bg-[rgba(27,42,50,.35)] sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
			<div
				ref={panelRef}
				role="dialog"
				aria-modal="true"
				aria-label={typeof title === 'string' ? title : undefined}
				className={cn('flex w-full max-h-full flex-col bg-white shadow-pop sm:max-h-[92vh] sm:rounded-[14px]', width, className)}
			>
				<div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-4 sm:px-7">
					{title ? <h2 className="text-xl font-semibold">{title}</h2> : null}
					{header}
					<button type="button" onClick={onClose} className="ml-auto grid size-8 place-items-center rounded-sm text-t2 hover:bg-muted hover:text-t1" aria-label="Close">
						<X size={18} />
					</button>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
				{footer ? <div className="shrink-0 border-t border-border px-5 py-3.5 sm:px-7">{footer}</div> : null}
			</div>
		</div>,
		document.body,
	);
}
