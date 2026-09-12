import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
	return <div className={cn('card', className)} {...rest} />;
}

export function CardHeader({ title, sub, action, className }: { title: ReactNode; sub?: ReactNode; action?: ReactNode; className?: string }) {
	return (
		<div className={cn('flex items-start justify-between gap-3', className)}>
			<div className="min-w-0">
				<h3 className="text-sm font-semibold text-t1">{title}</h3>
				{sub ? <p className="mt-0.5 text-xs text-t2">{sub}</p> : null}
			</div>
			{action}
		</div>
	);
}
