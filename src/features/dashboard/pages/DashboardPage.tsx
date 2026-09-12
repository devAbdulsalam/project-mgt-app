import { useMemo, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Calendar, ChevronDown, Download, Plus, RefreshCw } from 'lucide-react';
import { AppShell } from '@/shared/layouts/AppShell';
import { Button, Menu } from '@/shared/ui';
import { useAuthStore } from '@/shared/lib/auth-store';
import { formatLongDate, sleep } from '@/shared/lib/format';
import { useNow } from '@/shared/lib/time';
import { downloadCsv } from '@/shared/lib/csv';
import { toast } from '@/shared/lib/toast-store';
import { useDb } from '@/mocks/db';
import { KpiCard, KpiCardSkeleton } from '../components/KpiCard';
import { ChannelChart } from '../components/ChannelChart';
import { SlaCard } from '../components/SlaCard';
import { EngineerStatusCard, NeedsAttentionCard, TopClientsCard } from '../components/ListCards';
import { WelcomeBanner } from '../components/WelcomeBanner';
import { MobileHomeBody, MobileHomeHeader } from '../components/MobileHome';
import { dashboardCsv, getDashboardData, rangeLabels, ranges, type DashboardSearch, type Range } from '../model';
import { CreateTicketDialog } from '@/features/tickets/components/CreateTicketDialog';
import { TicketDetail } from '@/features/tickets/components/TicketDetail';

export function DashboardPage() {
	const org = useAuthStore((s) => s.org)!;
	const user = useAuthStore((s) => s.user)!;
	const navigate = useNavigate();
	const search = useSearch({ from: '/authed/$org/dashboard' });
	const tickets = useDb((s) => s.tickets);
	const now = useNow(30_000);
	const [refreshing, setRefreshing] = useState(false);
	const [refreshedAt, setRefreshedAt] = useState<number>();
	const [creating, setCreating] = useState(false);

	const range: Range = search.range;
	const data = useMemo(() => getDashboardData(range, tickets, now), [range, tickets, now]);
	const setSearch = (patch: Partial<DashboardSearch>) => navigate({ to: '/$org/dashboard', params: { org: org.slug }, search: { ...search, ...patch }, replace: true });

	const refresh = async () => {
		setRefreshing(true);
		await sleep(700);
		setRefreshing(false);
		setRefreshedAt(Date.now());
		toast('Dashboard refreshed', { tone: 'success', description: `${rangeLabels[range]} · ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` });
	};

	const exportCsv = () => {
		downloadCsv(`dashboard-${range}-${new Date().toISOString().slice(0, 10)}.csv`, dashboardCsv(data, range));
		toast('Dashboard exported', { tone: 'success', description: `CSV with KPIs, channel series, SLA and top clients for ${rangeLabels[range].toLowerCase()}.` });
	};

	const openTicket = (key: string) => setSearch({ panel: key });

	return (
		<AppShell meta={{ title: 'Dashboard', subtitle: `Operations overview · ${org.name}` }} mobileHeader={<MobileHomeHeader org={org} user={user} now={now} />}>
			{/* Mobile "Home" */}
			<div className="lg:hidden">
				<MobileHomeBody org={org} tickets={data.needsAttention} now={now} onOpen={openTicket} onCreate={() => setCreating(true)} />
			</div>

			{/* Desktop dashboard */}
			<div className="hidden space-y-5 lg:block">
				<WelcomeBanner org={org} user={user} invitesJustSent={search.welcome} />

				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h2 className="text-[22px] font-semibold">{formatLongDate(new Date(now), org.timezone)}</h2>
						<p className="text-[13px] text-t2">
							{org.timezoneLabel} · {org.cities.join(', ')}
							{refreshedAt ? ` · refreshed ${new Date(refreshedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}
						</p>
					</div>
					<div className="flex items-center gap-2.5">
						<Menu
							width="w-44"
							header="Date range"
							trigger={({ toggle, buttonProps }) => (
								<Button onClick={toggle} {...buttonProps}>
									<Calendar size={14} aria-hidden /> {rangeLabels[range]} <ChevronDown size={12} aria-hidden />
								</Button>
							)}
							items={ranges.map((r) => ({ key: r, label: rangeLabels[r], selected: r === range, onSelect: () => setSearch({ range: r }) }))}
						/>
						<Button onClick={refresh} loading={refreshing}>
							{!refreshing ? <RefreshCw size={15} aria-hidden /> : null} Refresh
						</Button>
						<Button onClick={exportCsv}>
							<Download size={15} aria-hidden /> Export
						</Button>
						<Button variant="primary" onClick={() => setCreating(true)}>
							<Plus size={15} aria-hidden /> New Ticket
						</Button>
					</div>
				</div>

				<section aria-label="Key metrics" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
					{refreshing ? data.kpis.map((k) => <KpiCardSkeleton key={k.id} />) : data.kpis.map((k) => <KpiCard key={k.id} kpi={k} />)}
				</section>

				<section className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
					<ChannelChart series={data.series} share={data.share} range={range} note={data.note} />
					<SlaCard summary={data.sla} periodLabel={rangeLabels[range]} />
				</section>

				<section className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
					<TopClientsCard clients={data.clients} orgSlug={org.slug} />
					<EngineerStatusCard orgSlug={org.slug} />
					<NeedsAttentionCard tickets={data.needsAttention} now={now} onOpen={openTicket} orgSlug={org.slug} />
				</section>
			</div>

			<CreateTicketDialog open={creating} onClose={() => setCreating(false)} onCreated={(key) => setSearch({ panel: key })} />
			{search.panel ? <TicketDetail ticketKey={search.panel} orgSlug={org.slug} onClose={() => setSearch({ panel: undefined })} /> : null}
		</AppShell>
	);
}
