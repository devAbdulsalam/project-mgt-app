import { ChevronDown, UserPlus, Flag, Activity, X } from 'lucide-react';
import { Button, Menu } from '@/shared/ui';
import { priorityLabel } from '@/shared/ui/meta';
import { team, useDb } from '@/mocks/db';
import { allPriorities, allStatuses } from '@/mocks/seed';
import { toast } from '@/shared/lib/toast-store';
import { useActor } from '../hooks/useActor';

export function BulkBar({ keys, onClear }: { keys: string[]; onClear: () => void }) {
	const actor = useActor();
	const bulk = useDb((s) => s.bulkUpdate);
	if (keys.length === 0) return null;
	const done = (n: number, what: string) => {
		toast(`${n} of ${keys.length} tickets ${what}`, { tone: n ? 'success' : 'default', description: n < keys.length ? 'Some tickets did not allow that change.' : undefined });
		onClear();
	};
	return (
		<div className="flex flex-wrap items-center gap-2 rounded-[10px] bg-brand-900 px-3.5 py-2 text-[13px] text-white" role="toolbar" aria-label="Bulk actions">
			<b>{keys.length} selected</b>
			<span className="mx-1 h-4 w-px bg-white/20" />
			<Menu
				width="w-56"
				trigger={({ toggle, buttonProps }) => (
					<Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={toggle} {...buttonProps}>
						<UserPlus size={13} aria-hidden /> Assign <ChevronDown size={12} aria-hidden />
					</Button>
				)}
				items={[
					{ key: 'me', label: 'Assign to me', onSelect: () => done(bulk(keys, { assigneeId: actor.id }, actor), 'assigned to you') },
					{ key: 'none', label: 'Unassign', onSelect: () => done(bulk(keys, { assigneeId: null }, actor), 'unassigned') },
					...team.filter((m) => m.id !== 'u_amr').map((m) => ({ key: m.id, label: m.name, hint: m.role, onSelect: () => done(bulk(keys, { assigneeId: m.id }, actor), `assigned to ${m.name.split(' ')[0]}`) })),
				]}
			/>
			<Menu
				width="w-52"
				trigger={({ toggle, buttonProps }) => (
					<Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={toggle} {...buttonProps}>
						<Activity size={13} aria-hidden /> Status <ChevronDown size={12} aria-hidden />
					</Button>
				)}
				items={allStatuses.map((s) => ({ key: s, label: s, onSelect: () => done(bulk(keys, { status: s }, actor), `moved to ${s}`) }))}
			/>
			<Menu
				width="w-44"
				trigger={({ toggle, buttonProps }) => (
					<Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={toggle} {...buttonProps}>
						<Flag size={13} aria-hidden /> Priority <ChevronDown size={12} aria-hidden />
					</Button>
				)}
				items={allPriorities.map((p) => ({ key: p, label: `${p} · ${priorityLabel[p]}`, onSelect: () => done(bulk(keys, { priority: p }, actor), `set to ${p}`) }))}
			/>
			<button type="button" onClick={onClear} className="ms-auto flex items-center gap-1 text-xs text-on-dark-muted hover:text-white">
				<X size={13} /> Clear
			</button>
		</div>
	);
}
