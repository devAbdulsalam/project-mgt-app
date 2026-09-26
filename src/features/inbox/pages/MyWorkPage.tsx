import { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ChevronDown, Filter, Plus, CalendarDays } from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import { Button, Card, DarkChips, EmptyState, Kbd, Menu, PillTabs, PriorityPill, StatusPill, TypeDot } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { usePaletteStore } from '@/shared/lib/palette-store';
import { useNow, dueLabel } from '@/shared/lib/time';
import { slaRunning } from '@/mocks/db';
import { allPriorities } from '@/mocks/seed';
import type { Priority } from '@/mocks/types';
import { priorityLabel } from '@/shared/ui/meta';
import { SlaCountdown } from '@/features/tickets/components/TicketBits';
import { TicketCards } from '@/features/tickets/components/TicketCards';
import { TicketDetail } from '@/features/tickets/components/TicketDetail';
import { CreateTicketDialog } from '@/features/tickets/components/CreateTicketDialog';
import { useActor } from '@/features/tickets/hooks/useActor';
import { useTicketActions } from '@/features/tickets/hooks/useTicketActions';
import { useMyWork } from '../hooks/useMyWork';
import { useTodaySchedule } from '../hooks/useTodaySchedule';

import { inboxTabs, type InboxSearch, type InboxTab } from '../model';

const labels: Record<InboxTab, string> = { assigned: 'Assigned', mentioned: 'Mentioned', watching: 'Watching', created: 'Created by me' };

const todayEvents = [
	{ time: '10:00', title: 'Sprint stand-up', sub: 'PayBridge team', color: '#2e6f86' },
	{ time: '14:00', title: 'Fibre fault follow-up · KS-2043', sub: 'Ikeja branch · comms room', color: '#e0a100' },
	{ time: '16:30', title: 'Roadmap review', sub: 'with Kemi, Yemi', color: '#6b3fa0' },
];

export function MyWorkPage() {
	const org = useAuthStore((s) => s.org)!;
	const user = useAuthStore((s) => s.user)!;
	const actor = useActor();
	const navigate = useNavigate();
	const search = useSearch({ from: '/authed/$org/inbox' });
	const actions = useTicketActions(org.slug);
	const setFocusedKey = usePaletteStore((s) => s.setFocusedKey);
	const openPalette = usePaletteStore((s) => s.setOpen);
	const now = useNow(30_000);
	const [focus, setFocus] = useState(0);
	const [creating, setCreating] = useState(false);

	const { list, counts, atRisk, loading } = useMyWork(org.slug, user.id, search);
	const today = useTodaySchedule(org.slug, todayEvents).events;
	const needYou = counts.assigned + counts.mentioned;

	const setSearch = (patch: Partial<InboxSearch>) => navigate({ to: '/$org/inbox', params: { org: org.slug }, search: { ...search, ...patch }, replace: true });
	const openTicket = (key: string) => setSearch({ panel: key });

	useEffect(() => {
		setFocusedKey(list[focus]?.key);
		return () => setFocusedKey(undefined);
	}, [list, focus, setFocusedKey]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (search.panel || (e.target as HTMLElement)?.tagName?.match(/INPUT|TEXTAREA|SELECT/)) return;
			if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); setFocus((f) => Math.min(list.length - 1, f + 1)); }
			else if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); setFocus((f) => Math.max(0, f - 1)); }
			else if (e.key === 'Enter' && list[focus]) openTicket(list[focus].key);
			else if (e.key === 'a' && list[focus]) { const t = list[focus]; void actions.assign(t, t.assigneeId === actor.id ? undefined : actor.id); }
			else if (e.key === 'c') setCreating(true);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [list, focus, search.panel]);

	const dateLabel = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
	const tabItems = inboxTabs.map((t) => ({ key: t, label: labels[t], count: counts[t] }));

	return (
		<AppShell
			meta={{ title: 'My Work', subtitle: `${dateLabel} · ${needYou} thing${needYou === 1 ? '' : 's'} need you` }}
			mobileHeader={
				<MobileHeader className={search.panel ? 'hidden' : undefined}>
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-xl font-semibold">My Work</h1>
							<p className="text-xs text-on-dark-muted">{needYou} things need you</p>
						</div>
						<button type="button" onClick={() => setCreating(true)} className="flex h-8 items-center gap-1 rounded-full bg-white px-3 text-[13px] font-semibold text-brand-900">
							<Plus size={14} /> New
						</button>
					</div>
					<DarkChips items={tabItems.map((t) => ({ ...t, label: t.key === 'created' ? 'Created' : t.label }))} value={search.tab} onChange={(tab) => setSearch({ tab })} className="mt-3" />
				</MobileHeader>
			}
		>
			<div className="hidden flex-wrap items-center gap-3 lg:flex">
				<PillTabs items={tabItems} value={search.tab} onChange={(tab) => setSearch({ tab })} className="min-w-0 flex-1" ariaLabel="My work" />
				<Menu
					align="end"
					width="w-48"
					trigger={({ toggle, buttonProps }) => (
						<Button onClick={toggle} {...buttonProps}>
							<Filter size={15} aria-hidden /> Filters{search.priority ? `: ${search.priority}` : ''} <ChevronDown size={13} aria-hidden />
						</Button>
					)}
					items={[
						{ key: 'all', label: 'Any priority', selected: !search.priority, onSelect: () => setSearch({ priority: undefined }) },
						...allPriorities.map((p: Priority) => ({ key: p, label: `${p} · ${priorityLabel[p]}`, selected: search.priority === p, onSelect: () => setSearch({ priority: p }) })),
					]}
				/>
				<Button variant="primary" onClick={() => setCreating(true)}>
					<Plus size={15} aria-hidden /> Create Ticket
				</Button>
			</div>

			<div className="mt-0 grid gap-4 lg:mt-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] [&>*]:min-w-0">
				<Card className="hidden overflow-hidden lg:block" data-tour="mywork-list">
					<div className="flex items-center justify-between px-5 pt-4 pb-2.5">
						<h3 className="text-sm font-semibold">{search.tab === 'assigned' ? 'Assigned to me' : search.tab === 'mentioned' ? 'Mentions' : search.tab === 'watching' ? 'Watching' : 'Created by me'}</h3>
						<span className="text-xs text-t2">
							Sorted by due · <Kbd>J</Kbd> <Kbd>K</Kbd> move · <Kbd>↵</Kbd> open · <Kbd>A</Kbd> assign · <Kbd>⌘K</Kbd> actions
						</span>
					</div>
					{list.length === 0 && loading ? (
						<p className="px-5 py-8 text-center text-[13px] text-t3">Loading your work…</p>
					) : list.length === 0 ? (
						<EmptyState title="Nothing here" action={<Button onClick={() => openPalette(true)}>Open command palette</Button>}>
							You're all caught up in this view.
						</EmptyState>
					) : (
						<ul>
							{list.map((t, i) => {
								const due = t.dueAt ? dueLabel(t.dueAt, now) : undefined;
								return (
									<li key={t.key}>
										<button
											type="button"
											onClick={() => { setFocus(i); openTicket(t.key); }}
											onFocus={() => setFocus(i)}
											className={cn('flex w-full items-center gap-3 border-t border-border px-4 py-[11px] text-left text-[13px] hover:bg-[#fafbfc]', i === focus && 'bg-brand-100/40 ring-1 ring-inset ring-brand-600/40')}
										>
											<TypeDot type={t.type} />
											<span className="font-mono text-xs text-t2">{t.key}</span>
											<span className={cn('min-w-0 flex-1 truncate', i === 0 && 'font-semibold')}>{t.title}</span>
											<PriorityPill priority={t.priority} long />
											<StatusPill status={t.status} />
											<span className="w-[80px] text-right text-xs">
												{t.sla && slaRunning(t) ? (
													<SlaCountdown ticket={t} now={now} />
												) : due ? (
													<span className={due.tone === 'muted' ? 'text-t2' : 'font-semibold text-high-fg'}>{due.label}</span>
												) : t.sprint ? (
													<span className="text-t2">{t.sprint}</span>
												) : (
													<span className="text-t3">—</span>
												)}
											</span>
										</button>
									</li>
								);
							})}
						</ul>
					)}
				</Card>

				<div className="lg:hidden" data-tour="m-mywork">
					{list.length === 0 ? <div className="card"><EmptyState title="Nothing here">You're all caught up in this view.</EmptyState></div> : <TicketCards tickets={list} now={now} onOpen={openTicket} />}
				</div>

				<div className="space-y-4">
					<Card className="p-5">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="text-sm font-semibold">Today</h3>
								<p className="text-xs text-t2">{today.length} event{today.length === 1 ? '' : 's'}</p>
							</div>
							<CalendarDays size={16} className="text-t3" aria-hidden />
						</div>
						<ul className="mt-3 space-y-2.5 text-[13px]">
							{today.length === 0 ? <li className="text-xs text-t3">Nothing scheduled today.</li> : null}
							{today.map((e) => (
								<li key={`${e.time}-${e.title}`} className="flex items-center gap-3">
									<span className="tabular w-11 text-xs text-t2">{e.time}</span>
									<span className="h-7 w-[3px] rounded-sm" style={{ background: e.color }} aria-hidden />
									<span>
										{e.title}
										<span className="block text-xs text-t2">{e.sub}</span>
									</span>
								</li>
							))}
						</ul>
					</Card>
					<Card className="p-5">
						<h3 className="text-sm font-semibold">At a glance</h3>
						<dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
							<div className="rounded-sm bg-muted p-3"><dt className="text-xs text-t2">Assigned to me</dt><dd className="tabular text-xl font-semibold">{counts.assigned}</dd></div>
							<div className="rounded-sm bg-muted p-3"><dt className="text-xs text-t2">SLA at risk</dt><dd className="tabular text-xl font-semibold text-high-fg">{atRisk ?? list.filter((t) => t.sla && slaRunning(t) && t.sla.resolveDueAt - now < 2 * 3600_000).length}</dd></div>
							<div className="rounded-sm bg-muted p-3"><dt className="text-xs text-t2">Mentions</dt><dd className="tabular text-xl font-semibold">{counts.mentioned}</dd></div>
							<div className="rounded-sm bg-muted p-3"><dt className="text-xs text-t2">Watching</dt><dd className="tabular text-xl font-semibold">{counts.watching}</dd></div>
						</dl>
					</Card>
				</div>
			</div>

			{search.panel ? <TicketDetail ticketKey={search.panel} orgSlug={org.slug} onClose={() => setSearch({ panel: undefined })} /> : null}
			<CreateTicketDialog open={creating} onClose={() => setCreating(false)} onCreated={(key) => setSearch({ panel: key })} />
		</AppShell>
	);
}
