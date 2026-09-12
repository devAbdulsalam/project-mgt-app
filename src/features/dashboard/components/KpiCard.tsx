import { ArrowDownRight, ArrowUpRight, Clock, Shield, Smile, Ticket } from 'lucide-react';
import { Card } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import type { Kpi } from '@/mocks/data';

const icons = { ticket: Ticket, clock: Clock, shield: Shield, smile: Smile };
const tints = {
	teal: 'bg-brand-100 text-brand-900',
	blue: 'bg-info-bg text-info-fg',
	green: 'bg-success-bg text-success-fg',
	yellow: 'bg-warning-bg text-warning-fg',
};

export function KpiCard({ kpi }: { kpi: Kpi }) {
	const Icon = icons[kpi.icon];
	const trend = kpi.trend;
	const TrendIcon = trend?.direction === 'down' ? ArrowDownRight : ArrowUpRight;
	return (
		<Card className="p-5">
			<div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-t2 uppercase">
				{kpi.label}
				<span className={cn('grid size-8 place-items-center rounded-full', tints[kpi.tint])} aria-hidden>
					<Icon size={15} />
				</span>
			</div>
			<div className="tabular mt-4 text-[32px] leading-none font-semibold text-t1">
				{kpi.value}
				{kpi.suffix ? <span className="text-base text-t3">{kpi.suffix}</span> : null}
			</div>
			{trend ? (
				<div className={cn('mt-3 flex items-center gap-1 text-xs', trend.good ? 'text-success' : 'text-high-fg')}>
					<TrendIcon size={12} aria-hidden />
					{trend.label}
				</div>
			) : (
				<div className="mt-3 text-xs text-t2">{kpi.note}</div>
			)}
		</Card>
	);
}

export function KpiCardSkeleton() {
	return (
		<Card className="p-5">
			<div className="skeleton h-3 w-24" />
			<div className="skeleton mt-4 h-8 w-20" />
			<div className="skeleton mt-3 h-3 w-32" />
		</Card>
	);
}
