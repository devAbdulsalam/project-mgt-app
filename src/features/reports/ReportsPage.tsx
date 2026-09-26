import { useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ChevronDown, Download, Mail, Plus, Sparkles, Star } from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import { Avatar, Button, Card, CardHeader, Dialog, Field, Input, Menu, ProgressBar, Select, StatTile } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { downloadCsv } from '@/shared/lib/csv';
import { toast } from '@/shared/lib/toast-store';
import { memberById, useDb } from '@/mocks/db';
import { useClients } from '@/api/resources';
import { isLiveApi } from '@/shared/lib/live-api';
import { useNow } from '@/shared/lib/time';
import { useProjectsReport, useServiceReport } from './hooks/useReports';
import { liveRangeLabel, rangeLabel as mockRangeLabel, rangeShort, type ReportsSearch } from './model';

export function ReportsPage() {
	const org = useAuthStore((s) => s.org)!;
	const navigate = useNavigate();
	const search = useSearch({ from: '/authed/$org/reports' });
	const live = isLiveApi();
	const now = useNow(60_000);
	const mockClients = useDb((s) => s.clientAccounts);
	const liveClients = useClients(live ? org.slug : '');
	const clients: { id: string; name: string; mrr?: number }[] = live ? (liveClients.data ?? []) : mockClients;
	const rangeLabel = live ? liveRangeLabel(now) : mockRangeLabel;
	const [scheduling, setScheduling] = useState(false);
	const setSearch = (patch: Partial<ReportsSearch>) => navigate({ to: '/$org/reports', params: { org: org.slug }, search: { ...search, ...patch }, replace: true });
	const clientScale = search.client ? Math.max(0.08, (clients.find((c) => c.id === search.client)?.mrr ?? 0) / 8_800_000) : 1;
	const isService = search.report === 'service';
	const { report: service, loading: serviceLoading } = useServiceReport(org.slug, org.timezone, search.range, live ? search.client : undefined, clientScale, isService);
	const { report: projects, loading: projectsLoading } = useProjectsReport(org.slug, org.timezone, search.range, !isService);
	const loading = isService ? serviceLoading : projectsLoading;
	const regions = ['All', 'Lagos', 'Abuja', 'Port Harcourt', 'Kano'];

	const exportCsv = () => {
		const rows = isService
			? [['Service desk report', rangeLabel[search.range]], [], ['KPI', 'Value', 'Note'], ...service.kpis.map((k) => [k.label, k.value, k.sub]), [], ['Day', 'P1 median h', 'P2 median h', 'P3 median h'], ...service.resolution.map((r) => [r.day, r.p1 ?? '', r.p2 ?? '', r.p3 ?? '']), [], ['Category', 'Tickets', 'Avg resolution'], ...service.categories.map((c) => [c.name, c.count, c.avg]), [], ['Client', 'CSAT', 'Responses'], ...service.csat.map((c) => [c.client, c.score, c.count]), [], ['Engineer', 'Billable %', 'Travel %', 'Idle %'], ...service.utilisation.map((u) => [u.name, u.billable, u.travel, u.idle])]
			: [['Projects report', rangeLabel[search.range]], [], ['KPI', 'Value', 'Note'], ...projects.kpis.map((k) => [k.label, k.value, k.sub]), [], ['Sprint', 'Committed', 'Completed'], ...projects.velocity.map((v) => [v.sprint, v.committed, v.completed]), [], ['Epic', 'Done', 'Total', 'Due'], ...projects.epics.map((e) => [e.name, e.done, e.total, e.due])];
		downloadCsv(`${search.report}-report-${search.range}.csv`, rows);
		toast('Report exported to CSV', { tone: 'success', description: 'PNG export renders the charts server-side and is not available in the demo.' });
	};

	const clientName = clients.find((c) => c.id === search.client)?.name;

	return (
		<AppShell meta={{ title: `Reports · ${isService ? 'Service desk' : 'Projects'}`, subtitle: isService ? 'SLA, response times, CSAT and engineer utilisation' : 'Velocity, cycle time and epic delivery' }} mobileHeader={<MobileHeader><h1 className="text-xl font-semibold" data-tour="m-reports">Reports</h1><p className="text-xs text-on-dark-muted">{isService ? 'Service desk' : 'Projects'} · {rangeShort[search.range]}</p></MobileHeader>}>
			<div className="flex flex-wrap items-center gap-2" data-tour="reports-controls">
				<Menu width="w-44" trigger={({ toggle, buttonProps }) => <Button variant="soft" size="sm" className="h-8" onClick={toggle} {...buttonProps}>{isService ? 'Service desk' : 'Projects'} <ChevronDown size={12} aria-hidden /></Button>} items={[{ key: 'service', label: 'Service desk', selected: isService, onSelect: () => setSearch({ report: 'service' }) }, { key: 'projects', label: 'Projects', selected: !isService, onSelect: () => setSearch({ report: 'projects' }) }]} />
				<Menu width="w-56" trigger={({ toggle, buttonProps }) => <Button size="sm" className="h-8" onClick={toggle} {...buttonProps}>{rangeLabel[search.range]} <ChevronDown size={12} aria-hidden /></Button>} items={(['30d', '90d', 'quarter'] as const).map((r) => ({ key: r, label: rangeLabel[r], selected: search.range === r, onSelect: () => setSearch({ range: r }) }))} />
				{isService ? <Menu width="w-64" trigger={({ toggle, buttonProps }) => <Button size="sm" className="h-8" onClick={toggle} {...buttonProps}>Clients: {clientName ?? 'All'} <ChevronDown size={12} aria-hidden /></Button>} items={[{ key: 'all', label: 'All clients', selected: !search.client, onSelect: () => setSearch({ client: undefined }) }, ...clients.map((c) => ({ key: c.id, label: c.name, selected: search.client === c.id, onSelect: () => setSearch({ client: c.id }) }))]} /> : null}
				{isService && !live ? <Menu width="w-44" trigger={({ toggle, buttonProps }) => <Button size="sm" className="h-8" onClick={toggle} {...buttonProps}>Region: {search.region ?? 'All'} <ChevronDown size={12} aria-hidden /></Button>} items={regions.map((r) => ({ key: r, label: r, selected: (search.region ?? 'All') === r, onSelect: () => setSearch({ region: r === 'All' ? undefined : r }) }))} /> : null}
				<Button size="sm" className={cn('h-8', search.compare && 'border-brand-600 bg-brand-100 text-brand-900')} onClick={() => setSearch({ compare: search.compare ? undefined : true })} aria-pressed={!!search.compare}>Compare: previous {search.range === 'quarter' ? 'quarter' : search.range}</Button>
				<div className="ms-auto flex items-center gap-2">
					<Button onClick={exportCsv}><Download size={15} aria-hidden /> PNG / CSV</Button>
					<Button onClick={() => setScheduling(true)}><Mail size={15} aria-hidden /> Schedule monthly</Button>
					<Button variant="primary" onClick={() => toast('Custom report builder', { description: 'Pick metrics, group by client or engineer, then save to the gallery. Coming after phase 3.' })}><Plus size={15} aria-hidden /> Custom report</Button>
				</div>
			</div>

			{loading ? <p className="mt-4 text-[13px] text-t3">Loading report…</p> : null}

			{isService ? (
				<>
					<div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">{service.kpis.map((k) => <StatTile key={k.label} label={k.label} value={k.value} sub={search.compare ? k.sub : k.sub.replace(/ vs prev/, '')} subTone={k.tone} />)}</div>
					<div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_1fr] [&>*]:min-w-0">
						<Card className="p-5" data-tour="reports-chart">
							<CardHeader title="Resolution time vs SLA · daily" sub="Median hours to resolve, by priority" action={<span className="flex gap-3 text-xs">{[['P1', '#b91c1c'], ['P2', '#c2410c'], ['P3', '#2f5f70']].map(([l, c]) => <span key={l} className="flex items-center gap-1.5"><span className="h-0.5 w-4" style={{ background: c }} />{l}</span>)}</span>} />
							<div className="mt-3 h-[260px]" role="img" aria-label="Line chart of median resolution hours per day for P1, P2 and P3 with SLA target lines">
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={service.resolution} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
										<CartesianGrid vertical={false} stroke="#e5e8ec" />
										<XAxis dataKey="day" tick={{ fontSize: 11, fill: '#5f6e78' }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(service.resolution.length / 5) - 1)} />
										<YAxis tick={{ fontSize: 11, fill: '#8a97a0' }} tickLine={false} axisLine={false} ticks={live ? undefined : [0, 2, 6, 12, 24]} domain={[0, live ? 'auto' : 24]} tickFormatter={(v: number) => `${v}h`} />
										<Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e8ec' }} formatter={(v) => [`${v}h`]} />
										{service.resolution.filter((r) => r.monthEnd).slice(0, 1).map((r) => <ReferenceArea key={r.day} x1={r.day} x2={service.resolution[Math.min(service.resolution.length - 1, service.resolution.indexOf(r) + 2)]!.day} fill="#fdf3d0" fillOpacity={0.6} label={{ value: 'Month-end', position: 'insideTop', fontSize: 10, fill: '#8a6a10' }} />)}
										<ReferenceLine y={4} stroke="#b91c1c" strokeDasharray="4 4" strokeOpacity={0.5} /><ReferenceLine y={8} stroke="#c2410c" strokeDasharray="4 4" strokeOpacity={0.5} /><ReferenceLine y={12} stroke="#2f5f70" strokeDasharray="4 4" strokeOpacity={0.5} />
										<Line connectNulls type="monotone" dataKey="p1" stroke="#b91c1c" strokeWidth={2} dot={false} isAnimationActive={false} name="P1" /><Line connectNulls type="monotone" dataKey="p2" stroke="#c2410c" strokeWidth={2} dot={false} isAnimationActive={false} name="P2" /><Line connectNulls type="monotone" dataKey="p3" stroke="#2f5f70" strokeWidth={2} dot={false} isAnimationActive={false} name="P3" />
									</LineChart>
								</ResponsiveContainer>
							</div>
							<p className="mt-2 text-xs text-t2">{live ? 'Dashed lines = SLA targets (P1 4h · P2 8h · P3 12h). Gaps are periods where nothing of that priority was resolved.' : 'Dashed lines = SLA targets (P1 4h · P2 8h · P3 2d). P3 breached target on 30 Aug – 1 Sep during month-end payroll surge.'}</p>
						</Card>
						<Card className="p-5">
							<CardHeader title="Busy hours · tickets created" sub={`WAT · ${rangeShort[search.range]} · darker = more`} />
							<div className="mt-3 overflow-x-auto"><div className="grid min-w-[420px] grid-cols-[36px_repeat(12,1fr)] gap-1 text-[10px] text-t2"><span />{Array.from({ length: 12 }, (_, i) => <span key={i} className="text-center">{7 + i}</span>)}{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, r) => [<span key={d} className="leading-6">{d}</span>, ...service.heat[r]!.map((v, c) => <span key={`${r}-${c}`} className="h-6 rounded-[4px]" style={{ background: `rgba(46, 111, 134, ${0.08 + v * 0.9})` }} title={`${d} ${7 + c}:00 · ${Math.round(v * (service.heatMax ?? 40))} tickets`} />)])}</div></div>
							<p className="mt-3 flex items-start gap-1.5 text-xs text-t2"><Sparkles size={13} className="mt-0.5 shrink-0 text-brand-600" aria-hidden /> {service.insight}</p>
						</Card>
					</div>
					<div className="mt-4 grid gap-4 xl:grid-cols-3 [&>*]:min-w-0">
						<Card className="p-5"><CardHeader title="Engineer utilisation" sub={`Billable · travel · idle, ${rangeShort[search.range]}`} /><ul className="mt-3 space-y-3">{service.utilisation.map((u) => { const m = memberById(u.id); return <li key={u.id} className="text-[13px]"><div className="flex items-center gap-2"><Avatar name={u.name} tint={m?.tint ?? 'teal'} size="sm" />{u.name}<b className={cn('tabular ms-auto', u.billable < 50 && 'text-high-fg')}>{u.billable + u.travel}%</b></div><div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-muted"><span style={{ width: `${u.billable}%`, background: '#2f5f70' }} /><span style={{ width: `${u.travel}%`, background: '#9fc7d8' }} /></div></li>; })}</ul><div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-t2"><span className="flex items-center gap-1"><span className="size-2.5 rounded-[3px] bg-brand-700" />Billable</span><span className="flex items-center gap-1"><span className="size-2.5 rounded-[3px] bg-[#9fc7d8]" />Travel</span><span className="flex items-center gap-1"><span className="size-2.5 rounded-[3px] bg-muted" />Idle</span><span className="ms-auto">{service.utilisation.find((u) => u.note)?.note}</span></div></Card>
						<Card className="p-5"><CardHeader title="Top categories" sub="By ticket count · avg resolution" /><ul className="mt-2 divide-y divide-border text-[13px]">{service.categories.map((c) => <li key={c.name} className="flex items-center gap-3 py-2.5"><span className="min-w-0 flex-1 truncate">{c.name}</span><b className="tabular">{c.count}</b><span className="tabular w-14 text-right text-xs text-t2">{c.avg}</span></li>)}</ul></Card>
						<Card className="p-5"><CardHeader title="CSAT · by client" sub="1–5 rating after resolution, via WhatsApp / email" /><ul className="mt-2 divide-y divide-border text-[13px]">{service.csat.length === 0 ? <li className="py-3 text-t3">{live ? 'No satisfaction ratings are collected yet.' : 'No ratings.'}</li> : null}{service.csat.map((c) => <li key={c.client} className="flex items-center gap-2 py-2.5"><span className="min-w-0 flex-1 truncate">{c.client}</span><span className="flex text-warning" aria-label={`${c.score} out of 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={12} fill={i <= Math.round(c.score) ? 'currentColor' : 'none'} />)}</span><b className={cn('tabular', c.score < 4 && 'text-high-fg')}>{c.score}</b><span className="text-xs text-t2">({c.count})</span></li>)}</ul>{service.csat.some((c) => c.score < 4) ? <div className="mt-3 flex items-start gap-2 rounded-sm bg-orange-bg px-3 py-2 text-xs text-orange-fg"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> Kano Textiles: 3 low ratings cite "slow callbacks" — renewal 30 Sep</div> : null}</Card>
					</div>
				</>
			) : (
				<>
					<div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">{projects.kpis.map((k) => <StatTile key={k.label} label={k.label} value={k.value} sub={k.sub} subTone={k.tone} />)}</div>
					<div className="mt-4 grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
						<Card className="p-5"><CardHeader title="Velocity" sub="Story points committed vs completed per sprint" /><div className="mt-3 h-[240px]" role="img" aria-label="Velocity bar chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={projects.velocity} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="30%"><CartesianGrid vertical={false} stroke="#e5e8ec" /><XAxis dataKey="sprint" tick={{ fontSize: 11, fill: '#5f6e78' }} tickLine={false} axisLine={false} /><YAxis tick={{ fontSize: 11, fill: '#8a97a0' }} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e8ec' }} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="committed" fill="#cbd2d9" radius={[3, 3, 0, 0]} isAnimationActive={false} name="Committed" /><Bar dataKey="completed" fill="#2f5f70" radius={[3, 3, 0, 0]} isAnimationActive={false} name="Completed" /></BarChart></ResponsiveContainer></div></Card>
						<Card className="p-5"><CardHeader title="Cycle time" sub="Days from In progress to Done, weekly median" /><div className="mt-3 h-[240px]" role="img" aria-label="Cycle time line chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={projects.cycle} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e5e8ec" /><XAxis dataKey="week" tick={{ fontSize: 11, fill: '#5f6e78' }} tickLine={false} axisLine={false} /><YAxis tick={{ fontSize: 11, fill: '#8a97a0' }} tickLine={false} axisLine={false} domain={[0, 6]} tickFormatter={(v: number) => `${v}d`} /><Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e8ec' }} formatter={(v) => [`${v} days`]} /><ReferenceLine y={4} stroke="#e0a100" strokeDasharray="4 4" label={{ value: 'Target 4d', fontSize: 10, fill: '#8a6a10', position: 'insideTopRight' }} /><Line type="monotone" dataKey="days" stroke="#2f5f70" strokeWidth={2} dot={false} isAnimationActive={false} name="Cycle time" /></LineChart></ResponsiveContainer></div></Card>
					</div>
					<Card className="mt-4 p-5"><CardHeader title="Epic delivery" sub="Rollup progress and due dates" /><ul className="mt-3 divide-y divide-border text-[13px]">{projects.epics.map((e) => <li key={e.name} className="flex items-center gap-4 py-3"><span className="w-56 truncate font-semibold">{e.name}</span><ProgressBar value={e.total ? (e.done / e.total) * 100 : 0} color={e.total && e.done === e.total ? '#22a05b' : e.total && e.done / e.total < 0.3 ? '#e0a100' : '#6b3fa0'} className="flex-1" label={e.name} /><span className="tabular w-16 text-right text-t2">{e.done} / {e.total}</span><span className="w-20 text-right text-xs text-t2">Due {e.due}</span></li>)}</ul></Card>
				</>
			)}

			<ScheduleDialog open={scheduling} onClose={() => setScheduling(false)} report={isService ? 'Service desk' : 'Projects'} />
		</AppShell>
	);
}

function ScheduleDialog({ open, onClose, report }: { open: boolean; onClose: () => void; report: string }) {
	const [to, setTo] = useState('management@kolanutsystems.ng');
	const [day, setDay] = useState('1st of the month');
	return (
		<Dialog open={open} onClose={onClose} title="Schedule monthly report" width="max-w-[480px]" footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => { toast(`${report} report scheduled`, { tone: 'success', description: `Emailed to ${to} on the ${day}, PDF + CSV attached.` }); onClose(); }}>Schedule</Button></div>}>
			<div className="space-y-4 px-5 py-5 sm:px-7">
				<Field label="Report">{(id) => <Input id={id} readOnly value={`${report} · previous month`} className="bg-muted" />}</Field>
				<Field label="Send to">{(id) => <Input id={id} value={to} onChange={(e) => setTo(e.target.value)} />}</Field>
				<Field label="When">{(id) => <Select id={id} value={day} onChange={(e) => setDay(e.target.value)}><option>1st of the month</option><option>First Monday</option><option>Last working day</option></Select>}</Field>
			</div>
		</Dialog>
	);
}
