import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import type { EngineerStatus } from '@/mocks/data';
import type { Priority, Status } from '@/mocks/types';
import { priorityLabel, priorityTone, statusTone } from './meta';

export type PillTone = 'new' | 'open' | 'progress' | 'pending' | 'review' | 'blocked' | 'done' | 'closed' | 'low' | 'medium' | 'high' | 'critical' | 'teal';

const tones: Record<PillTone, string> = {
	new: 'bg-[#e3e9f7] text-[#3b5baa]',
	open: 'bg-warning-bg text-warning-fg',
	progress: 'bg-info-bg text-info-fg',
	pending: 'bg-orange-bg text-orange-fg',
	review: 'bg-purple-bg text-purple-fg',
	blocked: 'bg-danger-bg text-danger-fg',
	done: 'bg-success-bg text-success-fg',
	closed: 'bg-grey-bg text-grey-fg',
	low: 'bg-grey-bg text-grey-fg',
	medium: 'bg-med-bg text-med-fg',
	high: 'bg-high-bg text-high-fg',
	critical: 'bg-danger-bg text-danger-fg',
	teal: 'bg-brand-100 text-brand-900',
};

export function Pill({ tone, children, className }: { tone: PillTone; children: ReactNode; className?: string }) {
	return (
		<span className={cn('inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-semibold', tones[tone], className)}>
			{children}
		</span>
	);
}

export function StatusPill({ status, className }: { status: Status; className?: string }) {
	return (
		<Pill tone={statusTone[status]} className={className}>
			{status}
		</Pill>
	);
}

export function PriorityPill({ priority, long, className }: { priority: Priority; long?: boolean; className?: string }) {
	return (
		<Pill tone={priorityTone[priority]} className={className}>
			{long ? priorityLabel[priority] : priority}
		</Pill>
	);
}

const engineerTone: Record<EngineerStatus, PillTone> = { 'On site': 'done', 'En route': 'teal', Remote: 'progress', Available: 'new', Break: 'closed' };

export function EngineerStatusPill({ status }: { status: EngineerStatus }) {
	return <Pill tone={engineerTone[status]}>{status}</Pill>;
}
