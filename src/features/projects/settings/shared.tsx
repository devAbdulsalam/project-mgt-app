import type { ReactNode } from 'react';
import { Button, Card } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';

export function Row({ label, sub, children, stacked }: { label: ReactNode; sub?: ReactNode; children: ReactNode; stacked?: boolean }) {
	return (
		<div className={cn('grid gap-2 border-b border-border py-4 last:border-b-0', !stacked && 'sm:grid-cols-[200px_1fr] sm:gap-6')}>
			<div>
				<b className="block text-[13px]">{label}</b>
				{sub ? <span className="text-xs text-t2">{sub}</span> : null}
			</div>
			<div className="min-w-0">{children}</div>
		</div>
	);
}

export function SaveBar({ dirty, onSave, onDiscard, saveLabel = 'Save changes', className }: { dirty: boolean; onSave: () => void; onDiscard: () => void; saveLabel?: string; className?: string }) {
	return (
		<div className={cn('mt-4 flex items-center justify-end gap-3', className)}>
			{dirty ? <span className="me-auto rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-medium text-warning-fg">Unsaved changes</span> : null}
			<Button variant="ghost" onClick={onDiscard} disabled={!dirty}>Discard</Button>
			<Button variant="primary" onClick={onSave} disabled={!dirty}>{saveLabel}</Button>
		</div>
	);
}

export function SectionCard({ title, sub, action, children, className }: { title: ReactNode; sub?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
	return (
		<Card className={cn('p-5', className)}>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="text-[16px] font-semibold">{title}</h2>
					{sub ? <p className="mt-0.5 text-[13px] text-t2">{sub}</p> : null}
				</div>
				{action}
			</div>
			<div className="mt-2">{children}</div>
		</Card>
	);
}
