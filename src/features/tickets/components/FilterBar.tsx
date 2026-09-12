import { useEffect, useState } from 'react';
import { Search, ChevronDown, ArrowUpDown, List, LayoutGrid } from 'lucide-react';
import { Button, FilterChip, Menu } from '@/shared/ui';
import { channelMeta, typeMeta } from '@/shared/ui/meta';
import { cn } from '@/shared/lib/cn';
import { clients, team } from '@/mocks/db';
import { allChannels, allPriorities, allTypes } from '@/mocks/seed';
import { priorityLabel } from '@/shared/ui/meta';
import { sortLabels, sortOptions, type TicketSearch } from '../model/filters';

export function FilterBar({ search, onChange, meId, showType = true, showClient = true, className }: { search: TicketSearch; onChange: (patch: Partial<TicketSearch>) => void; meId: string; showType?: boolean; showClient?: boolean; className?: string }) {
	const [q, setQ] = useState(search.q ?? '');
	const [prevQ, setPrevQ] = useState(search.q);
	if (prevQ !== search.q) {
		setPrevQ(search.q);
		setQ(search.q ?? '');
	}
	useEffect(() => {
		const id = setTimeout(() => {
			if ((search.q ?? '') !== q) onChange({ q: q || undefined, page: 1 });
		}, 250);
		return () => clearTimeout(id);
	}, [q, search.q, onChange]);

	const toggleIn = <T extends string>(arr: T[] | undefined, v: T): T[] | undefined => {
		const next = arr?.includes(v) ? arr.filter((x) => x !== v) : [...(arr ?? []), v];
		return next.length ? next : undefined;
	};

	const hasFilters = !!(search.channel?.length || search.priority?.length || search.type?.length || search.client || search.assignee || search.q);

	return (
		<div className={cn('flex flex-wrap items-center gap-2', className)}>
			<label className="flex h-[30px] w-full items-center gap-2 rounded-sm border border-border-strong bg-white px-3 text-xs sm:w-auto sm:min-w-[160px]">
				<Search size={13} className="text-t2" aria-hidden />
				<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-t3" aria-label="Search tickets" />
			</label>

			<Menu
				width="w-48"
				trigger={({ toggle, buttonProps }) => (
					<FilterChip label="Channel" value={search.channel?.map((c) => channelMeta[c].label).join(', ')} onClick={toggle} onClear={() => onChange({ channel: undefined, page: 1 })} buttonProps={buttonProps} />
				)}
				items={allChannels.map((c) => ({ key: c, label: channelMeta[c].label, selected: search.channel?.includes(c), onSelect: () => onChange({ channel: toggleIn(search.channel, c), page: 1 }) }))}
			/>
			<Menu
				width="w-44"
				trigger={({ toggle, buttonProps }) => <FilterChip label="Priority" value={search.priority?.join(', ')} onClick={toggle} onClear={() => onChange({ priority: undefined, page: 1 })} buttonProps={buttonProps} />}
				items={allPriorities.map((p) => ({ key: p, label: `${p} · ${priorityLabel[p]}`, selected: search.priority?.includes(p), onSelect: () => onChange({ priority: toggleIn(search.priority, p), page: 1 }) }))}
			/>
			{showClient ? (
				<Menu
					width="w-64"
					trigger={({ toggle, buttonProps }) => <FilterChip label="Client" value={clients.find((c) => c.id === search.client)?.name} onClick={toggle} onClear={() => onChange({ client: undefined, page: 1 })} buttonProps={buttonProps} />}
					items={clients.map((c) => ({ key: c.id, label: c.name, hint: c.tier, selected: search.client === c.id, onSelect: () => onChange({ client: search.client === c.id ? undefined : c.id, page: 1 }) }))}
				/>
			) : null}
			<Menu
				width="w-60"
				trigger={({ toggle, buttonProps }) => (
					<FilterChip
						label="Engineer"
						value={search.assignee === 'me' ? 'Me' : search.assignee === 'unassigned' ? 'Unassigned' : team.find((m) => m.id === search.assignee)?.name}
						onClick={toggle}
						onClear={() => onChange({ assignee: undefined, page: 1 })}
						buttonProps={buttonProps}
					/>
				)}
				items={[
					{ key: 'me', label: 'Assigned to me', selected: search.assignee === 'me', onSelect: () => onChange({ assignee: search.assignee === 'me' ? undefined : 'me', page: 1 }) },
					{ key: 'unassigned', label: 'Unassigned', selected: search.assignee === 'unassigned', onSelect: () => onChange({ assignee: search.assignee === 'unassigned' ? undefined : 'unassigned', page: 1 }) },
					...team
						.filter((m) => m.id !== meId && m.id !== 'u_amr')
						.map((m) => ({ key: m.id, label: m.name, hint: m.role, selected: search.assignee === m.id, onSelect: () => onChange({ assignee: search.assignee === m.id ? undefined : m.id, page: 1 }) })),
				]}
			/>
			{showType ? (
				<Menu
					width="w-48"
					trigger={({ toggle, buttonProps }) => <FilterChip label="Type" value={search.type?.map((t) => typeMeta[t].label).join(', ')} onClick={toggle} onClear={() => onChange({ type: undefined, page: 1 })} buttonProps={buttonProps} />}
					items={allTypes.map((t) => ({ key: t, label: typeMeta[t].label, selected: search.type?.includes(t), onSelect: () => onChange({ type: toggleIn(search.type, t), page: 1 }) }))}
				/>
			) : null}
			{hasFilters ? (
				<button type="button" className="text-xs text-brand-600 hover:underline" onClick={() => onChange({ channel: undefined, priority: undefined, type: undefined, client: undefined, assignee: undefined, q: undefined, page: 1 })}>
					Clear
				</button>
			) : null}

			<div className="ms-auto flex items-center gap-2">
				<div className="hidden items-center rounded-sm border border-border-strong bg-white sm:flex" role="group" aria-label="View">
					<button type="button" onClick={() => onChange({ view: 'table' })} className={cn('grid h-[28px] w-9 place-items-center rounded-l-sm', search.view === 'table' ? 'bg-brand-100 text-brand-900' : 'text-t2 hover:bg-muted')} aria-pressed={search.view === 'table'} aria-label="Table view">
						<List size={15} />
					</button>
					<button type="button" onClick={() => onChange({ view: 'cards' })} className={cn('grid h-[28px] w-9 place-items-center rounded-r-sm', search.view === 'cards' ? 'bg-brand-100 text-brand-900' : 'text-t2 hover:bg-muted')} aria-pressed={search.view === 'cards'} aria-label="Card view">
						<LayoutGrid size={15} />
					</button>
				</div>
				<Menu
					align="end"
					width="w-44"
					trigger={({ toggle, buttonProps }) => (
						<Button size="sm" onClick={toggle} {...buttonProps}>
							<ArrowUpDown size={12} aria-hidden /> Sort: {sortLabels[search.sort]} <ChevronDown size={12} aria-hidden />
						</Button>
					)}
					items={sortOptions.map((s) => ({ key: s, label: sortLabels[s], selected: search.sort === s, onSelect: () => onChange({ sort: s, page: 1 }) }))}
				/>
			</div>
		</div>
	);
}
