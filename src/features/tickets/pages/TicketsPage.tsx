import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Outlet, useNavigate, useSearch, useParams } from '@tanstack/react-router';
import { Bookmark, ChevronDown, Download, Plus, Search, Ticket as TicketIcon } from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import { Button, DarkChips, EmptyState, Menu, Pagination, PillTabs } from '@/shared/ui';
import { useAuthStore } from '@/shared/lib/auth-store';
import { useNow } from '@/shared/lib/time';
import { useDb } from '@/mocks/db';
import { toast } from '@/shared/lib/toast-store';
import { activeFilterCount, exportCsv, filterTickets, PAGE_SIZE, savedViews, tabCounts, tabLabels, ticketTabs, type TicketSearch, type TicketTab } from '../model/filters';
import { TicketTable } from '../components/TicketTable';
import { TicketCards } from '../components/TicketCards';
import { FilterBar } from '../components/FilterBar';
import { BulkBar } from '../components/BulkBar';

/**
 * Reusable ticket list (global queue or project-scoped). Owns selection + pagination;
 * filters live in the URL via `search`/`onSearchChange`.
 */
export function TicketList({ search, onSearchChange, onOpen, projectKey, toolbar, orgSlug }: { search: TicketSearch; onSearchChange: (patch: Partial<TicketSearch>) => void; onOpen: (key: string) => void; projectKey?: string; toolbar?: ReactNode; orgSlug: string }) {
	const now = useNow(15_000);
	const user = useAuthStore((s) => s.user)!;
	const tickets = useDb((s) => s.tickets);
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const counts = useMemo(() => tabCounts(tickets, user.id, now, projectKey), [tickets, user.id, now, projectKey]);
	const filtered = useMemo(() => filterTickets(tickets, search, user.id, now, projectKey), [tickets, search, user.id, now, projectKey]);
	const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const page = Math.min(search.page, pageCount);
	const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	const toggle = (key: string) =>
		setSelected((s) => {
			const n = new Set(s);
			if (n.has(key)) n.delete(key);
			else n.add(key);
			return n;
		});
	const toggleAll = () => setSelected((s) => (pageItems.every((t) => s.has(t.key)) ? new Set() : new Set(pageItems.map((t) => t.key))));

	const isService = !projectKey || projectKey === 'KS' || projectKey === 'NET';
	const tabs = (projectKey && !isService ? (['open', 'unassigned', 'mine', 'resolved', 'all'] as TicketTab[]) : ticketTabs).map((t) => ({ key: t, label: tabLabels[t], count: counts[t] }));

	return (
		<div className="space-y-4">
			{/* Desktop header row */}
			<div className="hidden flex-wrap items-center gap-3 lg:flex">
				<PillTabs items={tabs} value={search.tab} onChange={(tab) => onSearchChange({ tab, page: 1 })} ariaLabel="Ticket status" className="min-w-0 flex-1" />
				<div className="flex items-center gap-2.5">
					<Menu
						align="end"
						width="w-60"
						header="Saved views"
						trigger={({ toggle, buttonProps }) => (
							<Button onClick={toggle} {...buttonProps}>
								<Bookmark size={15} aria-hidden /> Saved views <ChevronDown size={13} aria-hidden />
							</Button>
						)}
						items={savedViews.map((v) => ({ key: v.id, label: v.name, onSelect: () => onSearchChange({ channel: undefined, priority: undefined, type: undefined, client: undefined, assignee: undefined, q: undefined, ...v.search, page: 1 }) }))}
					/>
					<Button
						onClick={() => {
							exportCsv(filtered);
							toast(`Exported ${filtered.length} tickets to CSV`, { tone: 'success' });
						}}
					>
						<Download size={15} aria-hidden /> Export
					</Button>
					{toolbar}
				</div>
			</div>

			<div className="hidden lg:block">
				<FilterBar search={search} onChange={onSearchChange} meId={user.id} showClient={isService} />
			</div>

			<BulkBar keys={Array.from(selected)} onClear={() => setSelected(new Set())} />

			{/* Mobile chips */}
			<div className="lg:hidden">
				<div className="flex items-center gap-2">
					<label className="input h-10 flex-1">
						<Search size={15} className="text-t2" aria-hidden />
						<input value={search.q ?? ''} onChange={(e) => onSearchChange({ q: e.target.value || undefined, page: 1 })} placeholder="Search tickets" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-t3" aria-label="Search tickets" />
					</label>
				</div>
			</div>

			{filtered.length === 0 ? (
				<div className="card">
					<EmptyState icon={<TicketIcon size={20} />} title="No tickets match" action={activeFilterCount(search) ? <Button onClick={() => onSearchChange({ channel: undefined, priority: undefined, type: undefined, client: undefined, assignee: undefined, q: undefined, page: 1 })}>Clear filters</Button> : null}>
						{activeFilterCount(search) ? 'Try widening your filters.' : 'Nothing in this view right now.'}
					</EmptyState>
				</div>
			) : (
				<>
					<div className="card hidden overflow-hidden lg:block">
						{search.view === 'cards' ? (
							<div className="p-4">
								<TicketCards tickets={pageItems} now={now} onOpen={onOpen} className="grid gap-3 space-y-0 md:grid-cols-2 xl:grid-cols-3" />
							</div>
						) : (
							<TicketTable tickets={pageItems} now={now} selected={selected} onToggle={toggle} onToggleAll={toggleAll} onOpen={onOpen} showProject={!isService} orgSlug={orgSlug} />
						)}
						<Pagination page={page} pageCount={pageCount} onChange={(p) => onSearchChange({ page: p })} total={filtered.length} pageSize={PAGE_SIZE} className="border-t border-border px-5 py-3.5" />
					</div>
					<div className="lg:hidden">
						<TicketCards tickets={pageItems} now={now} onOpen={onOpen} />
						<Pagination page={page} pageCount={pageCount} onChange={(p) => onSearchChange({ page: p })} total={filtered.length} pageSize={PAGE_SIZE} className="pt-4" />
					</div>
				</>
			)}
		</div>
	);
}

export function TicketsPage() {
	const org = useAuthStore((s) => s.org)!;
	const user = useAuthStore((s) => s.user)!;
	const navigate = useNavigate();
	const search = useSearch({ from: '/authed/$org/tickets' });
	const params = useParams({ strict: false }) as { key?: string };
	const tickets = useDb((s) => s.tickets);
	const now = useNow(60_000);
	const counts = useMemo(() => tabCounts(tickets, user.id, now), [tickets, user.id, now]);

	const onSearchChange = useCallback(
		(patch: Partial<TicketSearch>) => navigate({ to: '/$org/tickets', params: { org: org.slug }, search: { ...search, ...patch }, replace: true }),
		[navigate, org.slug, search],
	);
	const open = (key: string) => navigate({ to: '/$org/tickets/$key', params: { org: org.slug, key }, search });
	const create = () => navigate({ to: '/$org/tickets/new', params: { org: org.slug }, search });

	const mobileTabs = (['open', 'unassigned', 'mine', 'risk', 'resolved'] as TicketTab[]).map((t) => ({ key: t, label: t === 'open' ? 'All' : tabLabels[t], count: counts[t] }));

	return (
		<AppShell
			meta={{ title: 'Tickets', subtitle: `Helpdesk queue · ${counts.open} open` }}
			mobileHeader={
				<MobileHeader className={params.key ? 'hidden' : undefined}>
					<div className="flex items-center justify-between">
						<h1 className="text-xl font-semibold">Tickets</h1>
						<button type="button" onClick={create} className="flex h-8 items-center gap-1 rounded-full bg-white px-3 text-[13px] font-semibold text-brand-900">
							<Plus size={14} /> New
						</button>
					</div>
					<DarkChips items={mobileTabs} value={search.tab} onChange={(tab) => onSearchChange({ tab, page: 1 })} className="mt-3" />
				</MobileHeader>
			}
		>
			<TicketList
				search={search}
				onSearchChange={onSearchChange}
				onOpen={open}
				orgSlug={org.slug}
				toolbar={
					<Button variant="primary" onClick={create}>
						<Plus size={15} aria-hidden /> New Ticket
					</Button>
				}
			/>
			<Outlet />
		</AppShell>
	);
}
