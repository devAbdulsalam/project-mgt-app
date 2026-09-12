import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowUpDown, ChevronDown, ChevronRight, Download, Mail, Plus, Search } from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import { Avatar, Button, Card, EmptyState, FilterChip, Menu, Pill, ProgressBar, StatTile } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { downloadCsv } from '@/shared/lib/csv';
import { formatNaira, formatNairaShort, useDb } from '@/mocks/db';
import { statusCategory } from '@/mocks/seed';
import { toast } from '@/shared/lib/toast-store';
import { useNow } from '@/shared/lib/time';
import { planTone, type ClientsSearch } from '../model';
import { AddClientDialog } from '../components/ClientDialogs';

const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export function ClientsPage() {
	const org = useAuthStore((s) => s.org)!;
	const navigate = useNavigate();
	const search = useSearch({ from: '/authed/$org/customers' });
	const clients = useDb((s) => s.clientAccounts);
	const tickets = useDb((s) => s.tickets);
	const now = useNow(60_000);
	const [adding, setAdding] = useState(false);
	const setSearch = (patch: Partial<ClientsSearch>) => navigate({ to: '/$org/customers', params: { org: org.slug }, search: { ...search, ...patch }, replace: true });

	const openCount = (id: string) => tickets.filter((t) => t.clientId === id && statusCategory[t.status] !== 'done');
	const list = useMemo(
		() =>
			clients
				.filter((c) => !search.q || `${c.name} ${c.rc} ${c.contacts.map((k) => k.name).join(' ')}`.toLowerCase().includes(search.q.toLowerCase()))
				.filter((c) => !search.industry || c.industry === search.industry)
				.filter((c) => !search.plan || c.plan === search.plan)
				.filter((c) => !search.city || c.city === search.city)
				.filter((c) => !search.renewal || c.renewalAt - now < 60 * 86_400_000)
				.sort((a, b) => (search.sort === 'name' ? a.name.localeCompare(b.name) : search.sort === 'renewal' ? a.renewalAt - b.renewalAt : search.sort === 'health' ? (a.healthPct ?? 0) - (b.healthPct ?? 0) : search.sort === 'open' ? openCount(b.id).length - openCount(a.id).length : b.mrr - a.mrr)),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[clients, search, now, tickets],
	);
	const mrr = clients.reduce((s, c) => s + c.mrr, 0);
	const renewals = clients.filter((c) => c.renewalAt - now < 60 * 86_400_000 && c.status !== 'Trial');
	const avgHealth = Math.round(clients.filter((c) => c.healthPct).reduce((s, c) => s + (c.healthPct ?? 0), 0) / Math.max(1, clients.filter((c) => c.healthPct).length));
	const industries = Array.from(new Set(clients.map((c) => c.industry)));
	const cities = Array.from(new Set(clients.map((c) => c.city)));

	const exportCsv = () => {
		downloadCsv('clients.csv', [['Client', 'RC', 'Industry', 'City', 'Plan', 'Sites', 'Assets', 'Open', 'Hours used', 'Hours included', 'Health %', 'MRR', 'Renewal'], ...list.map((c) => [c.name, c.rc, c.industry, c.city, c.plan, c.siteList.length, c.assetsCount, openCount(c.id).length, c.hoursUsed, c.hoursIncluded, c.healthPct ?? '', c.mrr, fmtDate(c.renewalAt)])]);
		toast(`Exported ${list.length} clients`, { tone: 'success' });
	};

	return (
		<AppShell
			meta={{ title: 'Clients', subtitle: `${clients.length} accounts · ${formatNairaShort(mrr)} monthly recurring` }}
			mobileHeader={<MobileHeader><div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Clients</h1><button type="button" onClick={() => setAdding(true)} className="flex h-8 items-center gap-1 rounded-full bg-white px-3 text-[13px] font-semibold text-brand-900"><Plus size={14} /> Add</button></div><label className="input mt-3 h-10 border-transparent bg-white/10 text-white"><Search size={15} className="text-on-dark-muted" aria-hidden /><input value={search.q ?? ''} onChange={(e) => setSearch({ q: e.target.value || undefined })} placeholder="Search clients" className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-on-dark-muted" aria-label="Search clients" /></label></MobileHeader>}
		>
			<div className="hidden flex-wrap items-start justify-between gap-4 lg:flex">
				<div><h2 className="text-[22px] font-semibold">Clients</h2><p className="text-[13px] text-t2">Accounts, contracts, sites and contacts. Contract health blends SLA, CSAT and hours used.</p></div>
				<div className="flex items-center gap-2.5">
					<Button onClick={exportCsv}><Download size={15} aria-hidden /> Export</Button>
					<Button onClick={() => toast(`Statements queued for ${clients.filter((c) => c.status === 'Active').length} clients`, { tone: 'success', description: 'Sent by email with WhatsApp reminder for overdue invoices.' })}><Mail size={15} aria-hidden /> Send statements</Button>
					<Button variant="primary" onClick={() => setAdding(true)}><Plus size={15} aria-hidden /> Add client</Button>
				</div>
			</div>

			<div className="mt-0 hidden flex-wrap items-center gap-2 lg:mt-4 lg:flex">
				<label className="input h-[30px] w-[360px] text-xs"><Search size={13} className="text-t2" aria-hidden /><input value={search.q ?? ''} onChange={(e) => setSearch({ q: e.target.value || undefined })} placeholder="Search by name, RC number or contact…" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-t3" aria-label="Search clients" /></label>
				<Menu width="w-48" trigger={({ toggle, buttonProps }) => <FilterChip label="Industry" value={search.industry ?? 'All'} active={!!search.industry} onClick={toggle} onClear={() => setSearch({ industry: undefined })} buttonProps={buttonProps} />} items={industries.map((i) => ({ key: i, label: i, selected: search.industry === i, onSelect: () => setSearch({ industry: search.industry === i ? undefined : i }) }))} />
				<Menu width="w-40" trigger={({ toggle, buttonProps }) => <FilterChip label="Plan" value={search.plan ?? 'All'} active={!!search.plan} onClick={toggle} onClear={() => setSearch({ plan: undefined })} buttonProps={buttonProps} />} items={(['Gold', 'Silver', 'Bronze', 'Trial'] as const).map((p) => ({ key: p, label: p, selected: search.plan === p, onSelect: () => setSearch({ plan: search.plan === p ? undefined : p }) }))} />
				<Menu width="w-44" trigger={({ toggle, buttonProps }) => <FilterChip label="City" value={search.city ?? 'All'} active={!!search.city} onClick={toggle} onClear={() => setSearch({ city: undefined })} buttonProps={buttonProps} />} items={cities.map((c) => ({ key: c, label: c, selected: search.city === c, onSelect: () => setSearch({ city: search.city === c ? undefined : c }) }))} />
				<FilterChip label="Renewal ≤ 60 days" active={!!search.renewal} onClick={() => setSearch({ renewal: search.renewal ? undefined : true })} onClear={search.renewal ? () => setSearch({ renewal: undefined }) : undefined} />
				<Menu align="end" width="w-44" className="ms-auto" trigger={({ toggle, buttonProps }) => <Button size="sm" onClick={toggle} {...buttonProps}><ArrowUpDown size={12} aria-hidden /> Sort: {{ mrr: 'MRR', name: 'Name', renewal: 'Renewal', health: 'Health', open: 'Open tickets' }[search.sort]} <ChevronDown size={12} aria-hidden /></Button>} items={(['mrr', 'name', 'renewal', 'health', 'open'] as const).map((s) => ({ key: s, label: { mrr: 'MRR', name: 'Name', renewal: 'Renewal', health: 'Health', open: 'Open tickets' }[s], selected: search.sort === s, onSelect: () => setSearch({ sort: s }) }))} />
			</div>

			<div className="mt-4 hidden grid-cols-2 gap-4 lg:grid xl:grid-cols-4">
				<StatTile label="Active contracts" value={clients.filter((c) => c.status === 'Active').length} sub={`${clients.filter((c) => c.status === 'Trial').length} in trial · ${clients.filter((c) => c.status === 'Lapsed').length} lapsed`} />
				<StatTile label="MRR" value={formatNairaShort(mrr)} sub="+₦1.2M this quarter" subTone="good" />
				<StatTile label="Renewals · 60 days" value={renewals.length} sub={`${formatNairaShort(renewals.reduce((s, c) => s + c.mrr, 0))} at risk`} subTone="bad" />
				<StatTile label="Avg contract health" value={`${avgHealth}%`} sub="SLA · CSAT · hours" />
			</div>

			{list.length === 0 ? <Card className="mt-4"><EmptyState title="No clients match" /></Card> : null}

			<Card className="mt-4 hidden overflow-x-auto lg:block" data-tour="clients-table">
				{list.length ? (
					<table className="w-full text-[13px]">
						<thead><tr className="bg-muted text-left text-[11px] font-semibold tracking-wider text-t2 uppercase"><th className="px-4 py-3">Client</th><th className="px-4 py-3">Industry · City</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Sites</th><th className="px-4 py-3">Assets</th><th className="px-4 py-3">Open</th><th className="px-4 py-3">Hours used</th><th className="px-4 py-3">Health</th><th className="px-4 py-3">MRR</th><th className="px-4 py-3">Renewal</th><th className="w-8" /></tr></thead>
						<tbody>
							{list.map((c) => {
								const open = openCount(c.id);
								const p1 = open.filter((t) => t.priority === 'P1').length;
								const over = c.hoursUsed > c.hoursIncluded && c.hoursIncluded > 0;
								const renewSoon = c.renewalAt - now < 60 * 86_400_000;
								return (
									<tr key={c.id} className="cursor-pointer border-t border-border hover:bg-[#fafbfc]" onClick={() => navigate({ to: '/$org/customers/$clientId', params: { org: org.slug, clientId: c.id }, search: {} })}>
										<td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar name={c.name} tint={c.tint} size="lg" /><div><b className="block">{c.name}</b><span className="text-xs text-t2">{c.rc} · {c.contacts.find((k) => k.primary)?.name}</span></div></div></td>
										<td className="px-4 py-3"><div>{c.industry}</div><div className="text-xs text-t2">{c.city}</div></td>
										<td className="px-4 py-3"><Pill tone={planTone[c.plan]}>{c.plan}</Pill></td>
										<td className="tabular px-4 py-3">{c.siteList.length}</td>
										<td className="tabular px-4 py-3">{c.assetsCount}</td>
										<td className="tabular px-4 py-3"><b>{open.length}</b>{p1 ? <span className="ms-1 text-xs text-danger-fg">{p1} P1</span> : null}</td>
										<td className="px-4 py-3">{c.hoursIncluded ? <><ProgressBar value={(c.hoursUsed / c.hoursIncluded) * 100} color={over ? '#d93f3f' : c.hoursUsed / c.hoursIncluded > 0.7 ? '#e0a100' : '#2f5f70'} className="w-28" label="Hours used" /><span className={cn('text-xs', over ? 'text-danger-fg' : 'text-t2')}>{c.hoursUsed} / {c.hoursIncluded}h{over ? ' over' : ''}</span></> : <span className="text-xs text-t2">Pay-as-you-go</span>}</td>
										<td className="px-4 py-3">{c.healthPct ? <Pill tone={c.healthPct >= 90 ? 'done' : c.healthPct >= 80 ? 'open' : 'blocked'}>{c.healthPct}%</Pill> : <Pill tone="closed">—</Pill>}</td>
										<td className="tabular px-4 py-3 font-semibold">{formatNaira(c.mrr)}</td>
										<td className={cn('tabular px-4 py-3', renewSoon && c.status !== 'Trial' && 'font-semibold text-high-fg')}>{c.status === 'Trial' ? `Trial ends ${new Date(c.renewalAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : fmtDate(c.renewalAt)}</td>
										<td className="px-2 py-3 text-t3"><ChevronRight size={16} /></td>
									</tr>
								);
							})}
						</tbody>
					</table>
				) : null}
			</Card>

			<div className="space-y-3 lg:hidden" data-tour="m-clients">
				{list.map((c) => (
					<Link key={c.id} to="/$org/customers/$clientId" params={{ org: org.slug, clientId: c.id }} search={{}} className="flex items-center gap-3 rounded-md bg-white p-3.5 shadow-card"><Avatar name={c.name} tint={c.tint} size="lg" /><div className="min-w-0 flex-1"><b className="block truncate text-[15px]">{c.name}</b><span className="block truncate text-xs text-t2">{c.industry} · {c.city} · {openCount(c.id).length} open</span></div><Pill tone={planTone[c.plan]}>{c.plan}</Pill></Link>
				))}
			</div>

			<AddClientDialog open={adding} onClose={() => setAdding(false)} onCreated={(id) => navigate({ to: '/$org/customers/$clientId', params: { org: org.slug, clientId: id }, search: {} })} />
		</AppShell>
	);
}
