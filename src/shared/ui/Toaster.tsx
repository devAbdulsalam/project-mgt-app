import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore } from '@/shared/lib/toast-store';
import { cn } from '@/shared/lib/cn';

export function Toaster() {
	const toasts = useToastStore((s) => s.toasts);
	const dismiss = useToastStore((s) => s.dismiss);
	return (
		<div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--spacing-tabbar)+12px)] z-[60] flex flex-col items-center gap-2 px-4 lg:right-6 lg:bottom-6 lg:left-auto lg:items-end" role="region" aria-label="Notifications">
			{toasts.map((t) => {
				const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'danger' ? AlertTriangle : Info;
				return (
					<div
						key={t.id}
						role="status"
						aria-live="polite"
						className={cn('pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-[10px] border bg-white px-3.5 py-3 text-[13px] shadow-pop', t.tone === 'danger' ? 'border-danger-bg' : 'border-border')}
					>
						<Icon size={16} className={cn('mt-px shrink-0', t.tone === 'success' ? 'text-success' : t.tone === 'danger' ? 'text-danger' : 'text-brand-600')} aria-hidden />
						<div className="min-w-0 flex-1">
							<b className="block">{t.title}</b>
							{t.description ? <span className="text-xs text-t2">{t.description}</span> : null}
						</div>
						{t.action ? (
							<button
								type="button"
								className="shrink-0 text-xs font-semibold text-brand-600 hover:underline"
								onClick={() => {
									t.action?.onClick();
									dismiss(t.id);
								}}
							>
								{t.action.label}
							</button>
						) : null}
						<button type="button" onClick={() => dismiss(t.id)} className="shrink-0 text-t3 hover:text-t1" aria-label="Dismiss">
							<X size={14} />
						</button>
					</div>
				);
			})}
		</div>
	);
}
