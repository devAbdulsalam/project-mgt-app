import { useMemo, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, Circle, HelpCircle, MessageSquare, Plus, Zap, X, Minus } from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import { Avatar, Button, Card, Dialog, EmptyState, Field, Input, Menu, Pill, PriorityPill, Select } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { formatTime, useNow } from '@/shared/lib/time';
import { toast } from '@/shared/lib/toast-store';
import { formatNaira, memberById, useDb } from '@/mocks/db';
import { statusCategory } from '@/mocks/seed';
import type { Visit, VisitStatus } from '@/mocks/types';
import { TicketDetail } from '@/features/tickets/components/TicketDetail';
import { priorityColor, type VisitsSearch } from './model';

const DAY_START = 8;
const DAY_END = 18;
const statusTone = (s: VisitStatus) => (s === 'Done' || s === 'On site' ? 'done' : s === 'En route' ? 'teal' : s === 'Scheduled' ? 'progress' : 'open') as const;
const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

function pct(ts: number) {
	const d = new Date(ts);
	return Math.max(0, Math.min(100, ((d.getHours() + d.getMinutes() / 60 - DAY_START) / (DAY_END - DAY_START)) * 100));
}

export function VisitsPage() {
	const org = useAuthStore((s) => s.org)!;
	const navigate = useNavigate();
	const search = useSearch({ from: '/authed/$org/visits' });
	const visits = useDb((s) => s.visits);
	const members = useDb((s) => s.members);
	const clients = useDb((s) => s.clientAccounts);
	const tickets = useDb((s) => s.tickets);
	const scheduleVisit = useDb((s) => s.scheduleVisit);
	const unscheduleVisit = useDb((s) => s.unscheduleVisit);
	const advanceVisit = useDb((s) => s.advanceVisit);
	const approvePart = useDb((s) => s.approvePart);
	const createVisit = useDb((s) => s.createVisit);
	const now = useNow(30_000);
	const [dragId, setDragId] = useState<string>();
	const [overEng, setOverEng] = useState<string>();
	const [scheduling, setScheduling] = useState(false);
	const setSearch = (patch: Partial<VisitsSearch>) => navigate({ to: '/$org/visits', params: { org: org.slug }, search: { ...search, ...patch }, replace: true });

	const region = search.region ?? 'Lagos';
	const regions = Array.from(new Set(visits.map((v) => v.region)));
	const engineers = members.filter((m) => m.status === 'Active' && (m.role === 'Field engineer' || m.role === 'Support agent'));
	const regionEngineers = engineers.filter((m) => region === 'All' || m.base.startsWith(region) || (region === 'Lagos' && m.base.startsWith('Remote')) || m.role === 'Support agent');
	const unscheduled = visits.filter((v) => v.status === 'Unscheduled' && (region === 'All' || v.region === region) && (!search.client || v.clientId === search.client));
	const todays = visits.filter((v) => v.startAt && sameDay(v.startAt, now) && (region === 'All' || v.region === region));
	const current = visits.find((v) => v.id === search.visit) ?? todays.find((v) => v.status === 'On site') ?? todays[0];
	const currentEngineer = memberById(current?.engineerId);
	const clientName = (id: string) => clients.find((c) => c.id === id)?.name.replace(/ (Ltd|Plc|Co\.|Cooperative)$/, '') ?? id;

	const drop = (engineerId: string, e: React.DragEvent) => {
		const id = dragId ?? e.dataTransfer.getData('text/plain');
		setDragId(undefined);
		setOverEng(undefined);
		if (!id) return;
		const v = visits.find((x) => x.id === id);
		if (!v) return;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		const hour = DAY_START + Math.round(frac * (DAY_END - DAY_START) * 2) / 2;
		const start = new Date(now); start.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
		scheduleVisit(id, engineerId, start.getTime());
		toast(`${v.ticketKey} scheduled`, { tone: 'success', description: `${memberById(engineerId)?.name} · ${formatTime(start.getTime())} · ${v.durationMin} min` });
		setSearch({ visit: id });
	};

	const autoRoute = () => {
		if (unscheduled.length === 0) return toast('Nothing to route');
		let n = 0;
		unscheduled.forEach((v) => {
			const pool = engineers.filter((m) => m.role === 'Field engineer' && (m.base.startsWith(v.region) || (v.region === 'Ibadan' && m.base.startsWith('Lagos'))));
			if (pool.length === 0) return;
			const load = (id: string) => visits.filter((x) => x.engineerId === id && x.startAt && sameDay(x.startAt, now)).reduce((s, x) => s + x.durationMin, 0);
			const eng = pool.sort((a, b) => load(a.id) - load(b.id))[0]!;
			const startHour = Math.min(DAY_END - 1, Math.max(new Date(now).getHours() + 1, DAY_START + load(eng.id) / 60));
			const start = new Date(now); start.setHours(Math.floor(startHour), 0, 0, 0);
			scheduleVisit(v.id, eng.id, start.getTime());
			n++;
		});
		toast(`Auto-routed ${n} visit${n === 1 ? '' : 's'}`, { tone: 'success', description: 'Assigned to the least-loaded engineer in each region, traffic-aware ordering.' });
	};

	const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - d.getDay() + 1 + i); d.setHours(0, 0, 0, 0); return d; });

	return (
		<AppShell meta={{ title: 'Visits · Dispatch', subtitle: `${new Date(now).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })} · ${region} region` }} mobileHeader={<MobileHeader className={search.panel ? 'hidden' : undefined}><div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Visits</h1><button type="button" onClick={() => setScheduling(true)} className="flex h-8 items-center gap-1 rounded-full bg-white px-3 text-[13px] font-semibold text-brand-900"><Plus size={14} /> Schedule</button></div><p className="text-xs text-on-dark-muted">{todays.length} today · {unscheduled.length} unscheduled</p></MobileHeader>}>
			<div className="flex flex-wrap items-center gap-2.5">
				<div className="flex items-center rounded-sm border border-border-strong bg-white" role="group" aria-label="View">
					{(['today', 'week'] as const).map((v) => <button key={v} type="button" onClick={() => setSearch({ view: v })} className={cn('h-8 px-3 text-[13px] first:rounded-l-sm last:rounded-r-sm', search.view === v ? 'bg-brand-100 font-semibold text-brand-900' : 'text-t2 hover:bg-muted')} aria-pressed={search.view === v}>{v === 'today' ? 'Today' : 'Week view'}</button>)}
				</div>
				<Menu width="w-44" trigger={({ toggle, buttonProps }) => <Button size="sm" onClick={toggle} {...buttonProps}>Region: {region} <ChevronDown size={12} aria-hidden /></Button>} items={['All', ...regions].map((r) => ({ key: r, label: r, selected: region === r, onSelect: () => setSearch({ region: r === 'Lagos' ? undefined : r }) }))} />
				<span className="text-[13px] text-t2">Engineers: {regionEngineers.length}</span>
				<span className="hidden items-center gap-1.5 text-[13px] text-t2 md:flex"><AlertTriangle size={14} className="text-warning" aria-hidden /> Traffic: heavy on Third Mainland &amp; Ikorodu Rd</span>
				<div className="ms-auto flex items-center gap-2.5">
					<Button onClick={autoRoute}><Zap size={15} aria-hidden /> Auto-route</Button>
					<Button variant="primary" className="hidden lg:inline-flex" onClick={() => setScheduling(true)}><Plus size={15} aria-hidden /> Schedule visit</Button>
				</div>
			</div>

			{search.view === 'week' ? (
				<Card className="mt-4 overflow-x-auto">
					<table className="w-full text-[13px]">
						<thead><tr className="bg-muted text-left text-[11px] font-semibold tracking-wider text-t2 uppercase"><th className="px-4 py-3">Engineer</th>{weekDays.map((d) => <th key={d.getTime()} className={cn('px-3 py-3 text-center', sameDay(d.getTime(), now) && 'text-brand-900')}>{d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</th>)}</tr></thead>
						<tbody>
							{engineers.filter((m) => m.role === 'Field engineer').map((m) => (
								<tr key={m.id} className="border-t border-border">
									<td className="px-4 py-3"><span className="flex items-center gap-2"><Avatar name={m.name} tint={m.tint} size="sm" />{m.name}<span className="text-xs text-t2">· {m.base.split(' · ')[0]}</span></span></td>
									{weekDays.map((d) => { const dayVisits = visits.filter((v) => v.engineerId === m.id && v.startAt && sameDay(v.startAt, d.getTime())); const mins = dayVisits.reduce((s, v) => s + v.durationMin, 0); return <td key={d.getTime()} className={cn('px-3 py-3 text-center', sameDay(d.getTime(), now) && 'bg-brand-100/30')}>{dayVisits.length ? <button type="button" onClick={() => setSearch({ view: 'today', visit: dayVisits[0]!.id })} className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', mins > 420 ? 'bg-danger-bg text-danger-fg' : 'bg-success-bg text-success-fg')}>{dayVisits.length} · {Math.round(mins / 60)}h</button> : <span className="text-t3">—</span>}</td>; })}
								</tr>
							))}
						</tbody>
					</table>
					<p className="border-t border-border px-4 py-3 text-xs text-t2">Capacity per engineer is 4 visits / 7h per day. Red cells are over capacity.</p>
				</Card>
			) : (
				<div className="mt-4 grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_340px] [&>*]:min-w-0">
					{/* Unscheduled */}
					<Card className="p-4">
						<div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-[15px] font-semibold">Unscheduled <Pill tone="blocked">{unscheduled.length}</Pill></h3><span className="hidden text-xs text-t2 xl:inline">Drag onto an engineer</span></div>
						<ul className="mt-3 space-y-2.5">
							{unscheduled.length === 0 ? <li className="rounded-[10px] border border-dashed border-border-strong p-4 text-center text-xs text-t3">Everything is scheduled.</li> : null}
							{unscheduled.map((v) => (
								<li key={v.id} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', v.id); setDragId(v.id); }} onDragEnd={() => { setDragId(undefined); setOverEng(undefined); }} onClick={() => setSearch({ visit: v.id })} className={cn('cursor-grab rounded-[10px] border bg-white p-3 text-[13px] hover:border-border-strong active:cursor-grabbing', search.visit === v.id ? 'border-brand-600 ring-2 ring-brand-600/20' : 'border-border', dragId === v.id && 'opacity-40')}>
									<div className="flex items-center justify-between"><span className="font-mono text-xs text-t2">{v.ticketKey}</span><PriorityPill priority={v.priority} /></div>
									<b className="mt-1 block">{v.title}</b>
									<div className="text-xs text-t2">{clientName(v.clientId)} · {v.site.split(' · ')[0]} · ~{v.durationMin >= 60 ? `${v.durationMin / 60}h` : `${v.durationMin}m`}{v.window ? ` · ${v.window}` : ''}</div>
									<div className="mt-2 flex gap-1.5 xl:hidden"><Menu width="w-48" trigger={({ toggle, buttonProps }) => <Button size="sm" onClick={(e) => { e.stopPropagation(); toggle(); }} {...buttonProps}>Assign…</Button>} items={engineers.filter((m) => m.role === 'Field engineer').map((m) => ({ key: m.id, label: m.name, onSelect: () => { const s = new Date(now); s.setHours(Math.min(17, s.getHours() + 1), 0, 0, 0); scheduleVisit(v.id, m.id, s.getTime()); toast(`${v.ticketKey} assigned to ${m.name}`, { tone: 'success' }); } }))} /></div>
								</li>
							))}
						</ul>
					</Card>

					{/* Map + timeline */}
					<div className="space-y-4">
						<Card className="relative h-[300px] overflow-hidden bg-[#eef1f4]" aria-label={`${region} map with visit pins`}>
							<svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden>
								<path d="M0 22 L100 18" stroke="#fff" strokeWidth="2.2" /><path d="M0 40 L100 44" stroke="#fff" strokeWidth="2.2" /><path d="M18 0 L14 60" stroke="#fff" strokeWidth="1.6" /><path d="M45 0 L52 60" stroke="#fff" strokeWidth="1.6" /><path d="M72 0 L78 60" stroke="#fff" strokeWidth="1.6" /><path d="M0 52 L100 50 L100 60 L0 60 Z" fill="#dbe4ea" />
								<text x="50" y="57" fontSize="2.6" textAnchor="middle" fill="#5f6e78">{region === 'Lagos' ? 'Lagos Lagoon' : `${region} region`}</text>
							</svg>
							{['Ikeja', 'Yaba', 'Lekki', 'Surulere', 'Victoria Island'].map((n, i) => region === 'Lagos' ? <span key={n} className="absolute rounded-sm bg-white px-1.5 py-0.5 text-[10px] text-t2 shadow-card" style={{ left: `${[6, 38, 84, 22, 62][i]}%`, top: `${[6, 6, 6, 46, 62][i]}%` }}>{n}</span> : null)}
							{todays.filter((v) => v.status !== 'Done').map((v) => (
								<button key={v.id} type="button" onClick={() => setSearch({ visit: v.id })} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${v.mapX}%`, top: `${v.mapY}%` }} aria-label={`${v.ticketKey} at ${v.site}`}>
									<span className="grid size-7 place-items-center rounded-full rounded-br-none text-[10px] font-bold text-white shadow-pop" style={{ background: priorityColor[v.priority], transform: 'rotate(45deg)' }}><span style={{ transform: 'rotate(-45deg)' }}>{v.priority}</span></span>
									{search.visit === v.id ? <span className="absolute top-full left-1/2 mt-1 -translate-x-1/2 rounded-sm bg-white px-1.5 py-0.5 text-[10px] whitespace-nowrap text-t1 shadow-card">{v.ticketKey} · {v.site.split(' · ')[0]}</span> : null}
								</button>
							))}
							{todays.filter((v) => v.engineerId && (v.status === 'On site' || v.status === 'En route')).map((v) => { const m = memberById(v.engineerId)!; return <span key={m.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${v.mapX + (v.status === 'En route' ? 8 : 3)}%`, top: `${v.mapY + (v.status === 'En route' ? 10 : 4)}%` }} title={`${m.name} · ${v.status}`}><Avatar name={m.name} tint={v.status === 'On site' ? 'grey' : m.tint} size="sm" className={cn('ring-2 ring-white', v.status === 'On site' && 'bg-t1 text-white')} /></span>; })}
							<div className="absolute right-3 bottom-3 flex gap-3 rounded-full bg-white px-3 py-1 text-[11px] shadow-card">{(['P1', 'P2', 'P3', 'P4'] as const).map((p) => <span key={p} className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: priorityColor[p] }} />{p}</span>)}</div>
							<div className="absolute top-3 right-3 flex flex-col gap-1"><button type="button" className="grid size-7 place-items-center rounded-sm bg-white text-t2 shadow-card" aria-label="Zoom in"><Plus size={14} /></button><button type="button" className="grid size-7 place-items-center rounded-sm bg-white text-t2 shadow-card" aria-label="Zoom out"><Minus size={14} /></button></div>
						</Card>

						<Card className="p-4">
							<div className="ms-[188px] hidden justify-between text-[11px] text-t2 md:flex">{Array.from({ length: 6 }, (_, i) => DAY_START + i * 2).map((h) => <span key={h}>{h.toString().padStart(2, '0')}:00</span>)}</div>
							<ul className="mt-2 space-y-2">
								{regionEngineers.map((m) => {
									const mine = visits.filter((v) => v.engineerId === m.id && v.startAt && sameDay(v.startAt, now));
									const label = m.presence === 'On site' || m.presence === 'En route' ? m.presence : m.role === 'Support agent' ? 'Remote' : m.presence === 'Break' ? 'Break' : mine.some((v) => v.status === 'On site') ? 'On site' : 'Available';
									const canDrop = m.role === 'Field engineer';
									return (
										<li key={m.id} className="flex items-center gap-3">
											<div className="flex w-[176px] shrink-0 items-center gap-2 text-[13px]"><Avatar name={m.name} tint={m.tint} size="sm" /><span className="truncate">{m.name}</span><Pill tone={label === 'On site' ? 'done' : label === 'En route' ? 'teal' : label === 'Remote' ? 'progress' : label === 'Break' ? 'closed' : 'new'} className="hidden lg:inline-flex">{label}</Pill></div>
											<div className={cn('relative h-11 flex-1 rounded-sm bg-muted/70', overEng === m.id && canDrop && 'bg-brand-100 ring-2 ring-brand-600/40', overEng === m.id && !canDrop && 'bg-danger-bg/50')} onDragOver={(e) => { e.preventDefault(); if (overEng !== m.id) setOverEng(m.id); }} onDragLeave={() => overEng === m.id && setOverEng(undefined)} onDrop={(e) => { e.preventDefault(); if (canDrop) drop(m.id, e); else { setOverEng(undefined); toast(`${m.name} does not do field visits`, { tone: 'danger' }); } }} aria-label={`${m.name} timeline`}>
												{m.role === 'Support agent' ? <div className="absolute inset-y-1 left-0 right-0 rounded-sm bg-info-bg px-2 text-xs leading-9 text-info-fg">Helpdesk shift · remote sessions</div> : null}
												{mine.map((v) => { const left = pct(v.startAt!); const width = Math.max(4, (v.durationMin / 60 / (DAY_END - DAY_START)) * 100); return <button key={v.id} type="button" onClick={() => setSearch({ visit: v.id })} className={cn('absolute inset-y-1 truncate rounded-sm px-2 text-left text-xs font-medium text-white', search.visit === v.id && 'ring-2 ring-t1')} style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%`, background: v.status === 'Done' ? '#22a05b' : v.status === 'Scheduled' ? '#2f5f70' : priorityColor[v.priority], opacity: v.status === 'Done' ? 0.9 : 1 }} title={`${v.ticketKey} · ${v.title}`}>{v.ticketKey} {v.site.split(' · ')[0]}{v.status === 'Done' ? ' ✓' : ''}</button>; })}
												{dragId && canDrop && overEng === m.id ? <span className="pointer-events-none absolute inset-y-1 right-2 rounded-sm border border-dashed border-brand-600 px-2 text-xs leading-8 text-brand-900">Drop {visits.find((v) => v.id === dragId)?.ticketKey} here</span> : null}
											</div>
										</li>
									);
								})}
							</ul>
							<div className="pointer-events-none relative ms-[188px] hidden md:block"><span className="absolute -top-[calc(100%+8px)] h-0 w-px" style={{ left: `${pct(now)}%` }} /></div>
						</Card>
					</div>

					{/* Visit detail */}
					{current ? (
						<Card className="p-5">
							<div className="flex items-start justify-between gap-2"><div><h3 className="text-[15px] font-semibold">Visit · {current.ticketKey}</h3><p className="text-xs text-t2">{current.site} · {current.address}</p></div><Pill tone={statusTone(current.status)}>{current.status}</Pill></div>
							<ol className="mt-4 space-y-2.5 text-[13px]">
								{current.checkpoints.map((c, i) => <li key={i} className="flex items-center gap-2.5">{c.done ? <CheckCircle2 size={16} className="text-success" aria-hidden /> : <Circle size={16} className="text-border-strong" aria-hidden />}<span className={cn(!c.done && 'text-t2', !c.done && current.checkpoints.findIndex((x) => !x.done) === i && 'font-semibold text-t1')}>{c.label}{c.at ? ` ${formatTime(c.at)}` : ''}{!c.done && current.checkpoints.findIndex((x) => !x.done) === i && current.status === 'On site' && c.label === 'Working' ? ` · ${Math.max(1, Math.round((now - (current.checkpoints[i - 1]?.at ?? now)) / 60_000))} min on site` : ''}</span></li>)}
							</ol>
							{current.status !== 'Done' && current.status !== 'Unscheduled' ? <Button size="md" variant="soft" className="mt-3" onClick={() => { advanceVisit(current.id); toast(`${current.ticketKey}: ${current.checkpoints.find((c) => !c.done)?.label ?? 'visit'} recorded`, { tone: 'success' }); }}>Record next checkpoint</Button> : null}
							{current.status === 'Unscheduled' ? <p className="mt-3 rounded-sm bg-muted px-3 py-2 text-xs text-t2">Drag this visit onto an engineer's timeline, or use Auto-route.</p> : null}
							{current.parts.length ? (
								<div className="mt-5"><h4 className="text-[13px] font-semibold">Parts &amp; billing</h4><ul className="mt-2 space-y-1.5 text-[13px]">{current.parts.map((p) => <li key={p.name} className="flex items-center justify-between"><span>{p.name}</span><b className="tabular">{formatNaira(p.amount)}</b></li>)}</ul>
									{current.parts.some((p) => p.approval === 'needs approval') ? <div className="mt-2 flex items-start gap-2 rounded-sm bg-orange-bg px-3 py-2 text-xs text-orange-fg"><AlertTriangle size={13} className="mt-0.5 shrink-0" /><span className="flex-1">Needs client approval — sent to {clients.find((c) => c.id === current.clientId)?.contacts.find((k) => k.channel === 'email')?.name ?? 'finance'}</span><button type="button" className="font-semibold underline" onClick={() => { current.parts.filter((p) => p.approval === 'needs approval').forEach((p) => approvePart(current.id, p.name)); toast('Parts approved', { tone: 'success' }); }}>Mark approved</button></div> : null}
								</div>
							) : null}
							<div className="mt-5"><h4 className="text-[13px] font-semibold">Engineer</h4>{currentEngineer ? <div className="mt-2 flex items-center gap-2.5 text-[13px]"><Avatar name={currentEngineer.name} tint={currentEngineer.tint} /><div className="min-w-0 flex-1"><b className="block">{currentEngineer.name}</b><span className="text-xs text-t2">{currentEngineer.phone ?? ''} · {currentEngineer.base}</span></div><button type="button" className="grid size-8 place-items-center rounded-sm border border-border-strong text-t2" aria-label="Message engineer" onClick={() => toast(`WhatsApp to ${currentEngineer.name}`)}><MessageSquare size={14} /></button><button type="button" className="grid size-8 place-items-center rounded-sm border border-border-strong text-t2" aria-label="Call engineer" onClick={() => toast(`Calling ${currentEngineer.name}`)}><HelpCircle size={14} /></button></div> : <p className="mt-2 text-[13px] text-t2">Unassigned</p>}</div>
							<div className="mt-4 grid grid-cols-2 gap-2">
								<Menu width="w-48" trigger={({ toggle, buttonProps }) => <Button onClick={toggle} block {...buttonProps}>Reassign</Button>} items={[...engineers.filter((m) => m.role === 'Field engineer' && m.id !== current.engineerId).map((m) => ({ key: m.id, label: m.name, onSelect: () => { scheduleVisit(current.id, m.id, current.startAt ?? now); toast(`Reassigned to ${m.name}`, { tone: 'success' }); } })), { key: 'none', label: 'Unschedule', danger: true, onSelect: () => { unscheduleVisit(current.id); toast('Visit unscheduled'); } }]} />
								<Button variant="primary" onClick={() => toast('Message sent to client', { tone: 'success', description: `"${currentEngineer?.name ?? 'An engineer'} is ${current.status === 'On site' ? 'on site' : 'on the way'}" via WhatsApp.` })}>Message client</Button>
							</div>
							<button type="button" className="mt-3 text-xs text-brand-600 hover:underline" onClick={() => setSearch({ panel: current.ticketKey })}>Open ticket {current.ticketKey}</button>
						</Card>
					) : <Card><EmptyState icon={<CalendarDays size={20} />} title="No visits today" /></Card>}
				</div>
			)}

			<ScheduleVisitDialog open={scheduling} onClose={() => setScheduling(false)} defaultClient={search.client} onCreated={(id) => setSearch({ visit: id, view: 'today' })} />
			{search.panel ? <TicketDetail ticketKey={search.panel} orgSlug={org.slug} onClose={() => setSearch({ panel: undefined })} /> : null}
		</AppShell>
	);

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function unusedGuard(_: Visit) { return tickets.length; }
}

function ScheduleVisitDialog({ open, onClose, onCreated, defaultClient }: { open: boolean; onClose: () => void; onCreated: (id: string) => void; defaultClient?: string }) {
	const tickets = useDb((s) => s.tickets);
	const clients = useDb((s) => s.clientAccounts);
	const members = useDb((s) => s.members);
	const createVisit = useDb((s) => s.createVisit);
	const form = useForm<{ ticketKey: string; engineerId: string; date: string; time: string; durationMin: number }>({ defaultValues: { ticketKey: '', engineerId: '', date: new Date().toISOString().slice(0, 10), time: '10:00', durationMin: 90 } });
	const candidates = tickets.filter((t) => t.clientId && statusCategory[t.status] !== 'done' && (!defaultClient || t.clientId === defaultClient));
	const submit = form.handleSubmit((v) => {
		const t = tickets.find((x) => x.key === v.ticketKey);
		if (!t) return form.setError('ticketKey', { message: 'Choose a ticket' });
		const client = clients.find((c) => c.id === t.clientId)!;
		const startAt = v.engineerId ? new Date(`${v.date}T${v.time}`).getTime() : undefined;
		const visit = createVisit({ ticketKey: t.key, title: t.title, clientId: client.id, site: t.site ?? client.siteList[0]?.name ?? '', address: client.siteList.find((s) => t.site && s.name.includes(t.site.split(' · ').pop() ?? ''))?.address ?? client.siteList[0]?.address ?? '', priority: t.priority, durationMin: Number(v.durationMin), region: client.city, engineerId: v.engineerId || undefined, startAt });
		toast(`Visit for ${t.key} ${v.engineerId ? 'scheduled' : 'added to unscheduled'}`, { tone: 'success' });
		form.reset();
		onCreated(visit.id);
		onClose();
	});
	return (
		<Dialog open={open} onClose={onClose} title="Schedule visit" width="max-w-[560px]" footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Schedule</Button></div>}>
			<form onSubmit={submit} className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-7">
				<Field label="Ticket" required error={form.formState.errors.ticketKey?.message} className="sm:col-span-2">{(id) => <Select id={id} {...form.register('ticketKey')}><option value="">Choose an open client ticket</option>{candidates.map((t) => <option key={t.key} value={t.key}>{t.key} · {t.title}</option>)}</Select>}</Field>
				<Field label="Engineer" hint="(leave empty to add to unscheduled)" className="sm:col-span-2">{(id) => <Select id={id} {...form.register('engineerId')}><option value="">Unassigned</option>{members.filter((m) => m.role === 'Field engineer' && m.status === 'Active').map((m) => <option key={m.id} value={m.id}>{m.name} · {m.base}</option>)}</Select>}</Field>
				<Field label="Date">{(id) => <Input id={id} type="date" {...form.register('date')} />}</Field>
				<Field label="Start time">{(id) => <Input id={id} type="time" {...form.register('time')} />}</Field>
				<Field label="Duration (minutes)">{(id) => <Input id={id} type="number" min={15} step={15} {...form.register('durationMin')} />}</Field>
			</form>
		</Dialog>
	);
}

export { X };
