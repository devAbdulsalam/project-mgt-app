import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export function Steps({ steps, current, onDark = false, className }: { steps: string[]; current: number; onDark?: boolean; className?: string }) {
	return (
		<ol className={cn('flex items-center gap-2 text-[13px]', className)} aria-label="Signup progress">
			{steps.map((label, i) => {
				const n = i + 1;
				const state = n < current ? 'done' : n === current ? 'current' : 'todo';
				return (
					<li key={label} className="contents">
						<span
							className={cn(
								'flex items-center gap-2',
								state === 'current' ? (onDark ? 'font-semibold text-white' : 'font-semibold text-t1') : onDark ? 'text-on-dark-muted' : 'text-t3',
							)}
							aria-current={state === 'current' ? 'step' : undefined}
						>
							<b
								className={cn(
									'grid size-[22px] place-items-center rounded-full text-[11px] font-bold',
									state === 'done' && 'bg-success-bg text-success-fg',
									state === 'current' && 'bg-brand-900 text-white',
									state === 'todo' && (onDark ? 'bg-white/10 text-white' : 'bg-muted text-t2'),
								)}
							>
								{state === 'done' ? <Check size={11} strokeWidth={3} aria-label="completed" /> : n}
							</b>
							<span className={cn(state !== 'current' && 'hidden sm:inline')}>{label}</span>
						</span>
						{i < steps.length - 1 ? <span className={cn('h-px flex-1 border-t', onDark ? 'border-white/20' : 'border-border')} aria-hidden /> : null}
					</li>
				);
			})}
		</ol>
	);
}
