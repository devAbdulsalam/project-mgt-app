import { cn } from '@/shared/lib/cn';

export function ProgressBar({ value, color, className, label }: { value: number; color?: string; className?: string; label?: string }) {
	return (
		<div className={cn('h-1.5 overflow-hidden rounded-full bg-muted', className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
			<div className="h-full rounded-full bg-brand-700 transition-[width]" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
		</div>
	);
}
