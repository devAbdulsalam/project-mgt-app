import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { CalendarDays, ChevronLeft, FileText, Mail, MessageSquare, Phone, Plus, HelpCircle } from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import { Avatar, Button, Card, CardHeader, EmptyState, Field, Input, LineTabs, Pill, PriorityPill, ProgressBar, StatTile, StatusPill, Textarea } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { formatNaira, formatNairaShort, memberById, useDb } from '@/mocks/db';
import { statusCategory } from '@/mocks/seed';
import { toast } from '@/shared/lib/toast-store';
import { relativeTime, useNow } from '@/shared/lib/time';
import { TicketDetail } from '@/features/tickets/components/TicketDetail';
import { CreateTicketDialog } from '@/features/tickets/components/CreateTicketDialog';
import { SlaCountdown } from '@/features/tickets/components/TicketBits';
import { planTone, type ClientDetailSearch, type ClientTab } from '../model';
import { AddContactDialog, AddSiteDialog, NoteComposer } from '../components/ClientDialogs';

const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const channelIcon = { whatsapp: MessageSquare, email: Mail, phone: Phone };

export function ClientDetailPage() {
	const org = useAuthStore((s) => s.org)!;
	const { clientId } = useParams({ from: '/authed/$org/customers/$clientId' });
	const search = useSearch({ from: '/authed/$org/customers/$clientId' });
	const navigate = useNavigate();
	const client = useDb((s) => s.clientAccounts.find((c) => c.id === clientId));
	const allTickets = useDb((s) => s.tickets);
	const allAssets = useDb((s) => s.assets);
	const allVisits = useDb((s) => s.visits);
	const updateClient = useDb((s) => s.updateClient);
	const setInvoiceStatus = useDb((s) => s.setInvoiceStatus);
	const now = useNow(60_000);
	const [creating, setCreating] = useState(false);
	const [siteDialog, setSiteDialog] = useState(false);
	const [contactDialog, setContactDialog] = useState(false);
	const [editContract, setEditContract] = useState(false);

	const tickets = useMemo(() => allTickets.filter((t) => t.clientId === clientId).sort((a, b) => b.updatedAt - a.updatedAt), [allTickets, clientId]);
	const assets = useMemo(() => allAssets.filter((a) => a.clientId === clientId), [allAssets, clientId]);
	const visits = useMemo(() => allVisits.filter((v) => v.clientId === clientId), [allVisits, clientId]);
	const setSearch = (patch: Partial<ClientDetailSearch>) => navigate({ to: '/$org/customers/$clientId', params: { org: org.slug, clientId }, search: { ...search, ...patch }, replace: true });

	if (!client) {
		return (
			<AppShell meta={{ title: 'Client not found' }}><Card><EmptyState title="No client with that id" action={<Link to="/$org/customers" params={{ org: org.slug }} search={{}}><Button variant="primary">Back to clients</Button></Link>} /></Card></AppShell>
		);
	}

	const open = tickets.filter((t) => statusCategory[t.status] !== 'done');
	const p1 = open.filter((t) => t.priority === 'P1').length;
	const manager = memberById(client.accountManagerId);
	const outstanding = client.invoices.filter((i) => i.status === 'Overdue' || i.status === 'Due').reduce((s, i) => s + i.amount, 0);
	const overdue = client.invoices.find((i) => i.status === 'Overdue');
	const renewDays = Math.round((client.renewalAt - now) / 86_400_000);
	const tabs: { key: ClientTab; label: string; count?: number }[] = [
		{ key: 'overview', label: 'Overview' }, { key: 'tickets', label: 'Tickets', count: open.length }, { key: 'sites', label: 'Sites & contacts' }, { key: 'assets', label: 'Assets', count: assets.length }, { key: 'contract', label: 'Contract & SLA' }, { key: 'invoices', label: 'Invoices' }, { key: 'visits', label: 'Visits', count: visits.length }, { key: 'notes', label: 'Notes', count: client.notes.length },
	];

	const header = (
		<div className="flex flex-wrap items-start gap-4">
			<Avatar name={client.name} tint={client.tint} size="lg" className="size-16 text-lg" />
			<div className="min-w-0 flex-1">
				<h2 className="flex flex-wrap items-center gap-2 text-[22px] font-semibold">{client.name}<Pill tone={planTone[client.plan]}>{client.contract.plan}</Pill>{client.healthPct ? <Pill tone={client.healthPct >= 90 ? 'done' : client.healthPct >= 80 ? 'open' : 'blocked'}>Health {client.healthPct}%</Pill> : <Pill tone="new">Trial</Pill>}</h2>
				<p className="text-[13px] text-t2">{client.rc} · {client.siteList.length} sites · {client.assetsCount} assets · Account manager: {manager?.name ?? '—'} · Since {new Date(client.since).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</p>
			</div>
			<div className="flex flex-wrap items-center gap-2.5">
				<Button onClick={() => toast(`Opening WhatsApp with ${client.contacts.find((k) => k.primary)?.name}`)}><MessageSquare size={15} aria-hidden /> WhatsApp</Button>
				<Button onClick={() => toast('Statement sent', { tone: 'success', description: `Emailed to ${client.contacts.find((k) => k.channel === 'email')?.email ?? 'the finance contact'}.` })}><FileText size={15} aria-hidden /> Statement</Button>
				<Link to="/$org/visits" params={{ org: org.slug }} search={{ client: client.id }}><Button><CalendarDays size={15} aria-hidden /> Schedule visit</Button></Link>
				<Button variant="primary" onClick={() => setCreating(true)}><Plus size={15} aria-hidden /> New ticket</Button>
			</div>
		</div>
	);

	return (
		<AppShell meta={{ title: client.name, subtitle: `Clients › ${client.industry} · ${client.city}` }} mobileHeader={<MobileHeader className={search.panel ? 'hidden' : undefined}><Link to="/$org/customers" params={{ org: org.slug }} search={{}} className="flex items-center gap-1 text-[13px] text-on-dark-muted"><ChevronLeft size={16} /> Clients</Link><h1 className="mt-1 text-xl font-semibold">{client.name}</h1><p className="text-xs text-on-dark-muted">{client.contract.plan} · {open.length} open · {client.city}</p></MobileHeader>}>
			<div className="hidden lg:block">{header}</div>
			<LineTabs items={tabs} value={search.tab} onChange={(tab) => setSearch({ tab })} className="mt-5" ariaLabel="Client sections" />

			{search.tab === 'overview' ? (
				<div className="mt-5 space-y-4">
					<div className="grid grid-cols-2 gap-4 xl:grid-cols-5 [&>*]:min-w-0">
						<StatTile label="Open tickets" value={<span className="flex items-center gap-2">{open.length}{p1 ? <Pill tone="critical">{p1} P1</Pill> : null}</span>} sub={`Avg ${(tickets.length / 10).toFixed(1)} / day`} />
						<StatTile label="SLA · 90 days" value={client.healthPct ? `${client.healthPct}%` : '—'} sub={client.healthPct ? (client.healthPct >= 92 ? 'Above 92% target' : 'Below 92% target') : 'No data yet'} subTone={client.healthPct && client.healthPct >= 92 ? 'good' : 'bad'} />
						<div className="card p-5"><div className="text-[11px] font-semibold tracking-wider text-t2 uppercase">Retainer hours</div><div className="tabular mt-3 text-[28px] leading-none font-semibold">{client.hoursUsed} / {client.hoursIncluded}h</div><ProgressBar value={client.hoursIncluded ? (client.hoursUsed / client.hoursIncluded) * 100 : 0} color={client.hoursUsed > client.hoursIncluded ? '#d93f3f' : undefined} className="mt-3" label="Retainer hours" /></div>
						<StatTile label="CSAT" value={client.csat ?? '—'} sub={client.csatCount ? `${client.csatCount} ratings` : 'No ratings yet'} />
						<StatTile label="Outstanding" value={<span className={outstanding ? 'text-high-fg' : undefined}>{formatNairaShort(outstanding)}</span>} sub={overdue ? `Invoice ${overdue.number} · ${Math.round((now - overdue.dueAt) / 86_400_000)} days overdue` : 'Nothing overdue'} subTone={overdue ? 'bad' : 'good'} />
					</div>
					<div className="grid gap-4 xl:grid-cols-3 [&>*]:min-w-0">
						<Card className="p-5">
							<CardHeader title="Contract & SLA" action={<button type="button" className="text-[13px] text-brand-600 hover:underline" onClick={() => setSearch({ tab: 'contract' })}>Edit</button>} />
							<dl className="mt-2 divide-y divide-border text-[13px]">
								{[['Plan', <b key="p">{client.contract.plan}</b>], ['Term', <span key="t">{fmtDate(client.contract.termStart)} – {fmtDate(client.contract.termEnd)} {renewDays < 90 ? <Pill tone="open" className="ms-2">Renews in {renewDays}d</Pill> : null}</span>], ['Fee', `${formatNaira(client.contract.feeMonthly)} / month · ${client.contract.hoursIncluded}h included · ${formatNaira(client.contract.overageRate)}/h overage`], ['Coverage', client.contract.coverage], ['SLA', client.contract.slaSummary], ['Scope', client.contract.scope], ['Excluded', client.contract.excluded], ['Documents', client.contract.documents.length ? client.contract.documents.map((d) => <button key={d} type="button" onClick={() => toast(`Opening ${d}`)} className="me-2 text-brand-600 hover:underline">{d}</button>) : '—']].map(([k, v]) => (
									<div key={k as string} className="flex gap-4 py-2.5"><dt className="w-24 shrink-0 text-t2">{k as string}</dt><dd className="min-w-0 flex-1">{v}</dd></div>
								))}
							</dl>
						</Card>
						<div className="space-y-4">
							<Card className="p-5">
								<CardHeader title="Sites" action={<button type="button" className="text-[13px] text-brand-600 hover:underline" onClick={() => setSiteDialog(true)}>+ Add site</button>} />
								<ul className="mt-3 space-y-2">
									{client.siteList.map((s) => (
										<li key={s.id} className={cn('flex items-center gap-3 rounded-[10px] border px-3.5 py-3 text-[13px]', s.note ? 'border-danger-bg bg-danger-bg/30' : 'border-border')}><div className="min-w-0 flex-1"><b className="block">{s.name}</b><span className="text-xs text-t2">{s.address} · {s.contactName} · {s.open} open</span></div>{s.note ? <Pill tone="critical">{s.note}</Pill> : <span className="text-xs text-t2">{s.assets} assets</span>}</li>
									))}
								</ul>
							</Card>
							<Card className="p-5">
								<CardHeader title="Key contacts" action={<button type="button" className="text-[13px] text-brand-600 hover:underline" onClick={() => setContactDialog(true)}>+ Add</button>} />
								<ul className="mt-2 divide-y divide-border">
									{client.contacts.map((k) => { const Icon = channelIcon[k.channel]; return <li key={k.id} className="flex items-center gap-3 py-2.5 text-[13px]"><Avatar name={k.name} tint="teal" size="sm" /><div className="min-w-0 flex-1"><b className="block">{k.name}</b><span className="text-xs text-t2">{k.role}{k.primary ? ' · primary' : ''}{k.channel === 'whatsapp' ? ' · WhatsApp ✓' : ''}</span></div><button type="button" className="text-t3 hover:text-t1" aria-label={`Contact ${k.name}`} onClick={() => toast(`Opening ${k.channel} to ${k.name}`)}>{k.channel === 'phone' ? <HelpCircle size={16} /> : <Icon size={16} />}</button></li>; })}
								</ul>
							</Card>
						</div>
						<div className="space-y-4">
							<Card className="p-5">
								<CardHeader title="Recent tickets" action={<button type="button" className="text-[13px] text-brand-600 hover:underline" onClick={() => setSearch({ tab: 'tickets' })}>All {tickets.length}</button>} />
								<ul className="mt-2 divide-y divide-border">
									{tickets.slice(0, 5).map((t) => <li key={t.key}><button type="button" onClick={() => setSearch({ panel: t.key })} className="flex w-full items-center gap-2.5 py-2.5 text-left text-[13px] hover:underline"><span className="font-mono text-xs text-t2">{t.key}</span><span className="min-w-0 flex-1 truncate">{t.title}</span><PriorityPill priority={t.priority} /><StatusPill status={t.status} /></button></li>)}
								</ul>
							</Card>
							<Card className="p-5">
								<CardHeader title="Billing" />
								<ul className="mt-2 divide-y divide-border">
									{client.invoices.slice(0, 3).map((i) => <li key={i.id} className="flex items-center gap-2.5 py-2.5 text-[13px]"><span className="font-mono text-xs text-t2">{i.number}</span><span className="min-w-0 flex-1 truncate">{i.label}</span><b className="tabular">{formatNaira(i.amount)}</b><Pill tone={i.status === 'Paid' ? 'done' : i.status === 'Overdue' ? 'blocked' : 'open'}>{i.status}</Pill></li>)}
									{client.invoices.length === 0 ? <li className="py-2.5 text-[13px] text-t3">No invoices yet.</li> : null}
								</ul>
								{overdue ? <p className="mt-2 text-xs text-t2">Pays by bank transfer · reminder sent via WhatsApp 2 days ago</p> : null}
							</Card>
						</div>
					</div>
				</div>
			) : null}

			{search.tab === 'tickets' ? (
				<Card className="mt-5 overflow-x-auto">
					{tickets.length === 0 ? <EmptyState title="No tickets for this client" action={<Button variant="primary" onClick={() => setCreating(true)}>New ticket</Button>} /> : (
						<table className="w-full text-[13px]"><thead><tr className="bg-muted text-left text-[11px] font-semibold tracking-wider text-t2 uppercase"><th className="px-4 py-3">Key</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Site</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Assignee</th><th className="px-4 py-3">SLA</th><th className="px-4 py-3">Updated</th></tr></thead>
							<tbody>{tickets.map((t) => <tr key={t.key} className="cursor-pointer border-t border-border hover:bg-[#fafbfc]" onClick={() => setSearch({ panel: t.key })}><td className="px-4 py-3 font-mono text-xs text-t2">{t.key}</td><td className="px-4 py-3"><b>{t.title}</b><div className="text-xs text-t2">{t.category}</div></td><td className="px-4 py-3">{t.site ?? '—'}</td><td className="px-4 py-3"><PriorityPill priority={t.priority} /></td><td className="px-4 py-3"><StatusPill status={t.status} /></td><td className="px-4 py-3">{memberById(t.assigneeId)?.name ?? <span className="text-t2">Unassigned</span>}</td><td className="px-4 py-3"><SlaCountdown ticket={t} now={now} /></td><td className="px-4 py-3 text-t2">{relativeTime(t.updatedAt, now)}</td></tr>)}</tbody></table>
					)}
				</Card>
			) : null}

			{search.tab === 'sites' ? (
				<div className="mt-5 grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
					<Card className="p-5"><CardHeader title="Sites" action={<Button size="sm" onClick={() => setSiteDialog(true)}><Plus size={13} /> Add site</Button>} /><ul className="mt-3 divide-y divide-border">{client.siteList.map((s) => <li key={s.id} className="flex items-start gap-3 py-3 text-[13px]"><div className="min-w-0 flex-1"><b className="block">{s.name}</b><span className="block text-xs text-t2">{s.address}</span><span className="text-xs text-t2">Contact: {s.contactName}</span></div><div className="text-right text-xs text-t2"><b className="block text-sm text-t1">{s.assets} assets</b>{s.open} open{s.note ? <Pill tone="critical" className="ms-2">{s.note}</Pill> : null}</div></li>)}</ul></Card>
					<Card className="p-5"><CardHeader title="Contacts" action={<Button size="sm" onClick={() => setContactDialog(true)}><Plus size={13} /> Add contact</Button>} /><ul className="mt-3 divide-y divide-border">{client.contacts.map((k) => <li key={k.id} className="flex items-center gap-3 py-3 text-[13px]"><Avatar name={k.name} tint="teal" /><div className="min-w-0 flex-1"><b className="block">{k.name}{k.primary ? <Pill tone="teal" className="ms-2">Primary</Pill> : null}</b><span className="text-xs text-t2">{k.role}</span><div className="text-xs text-t2">{k.phone ?? ''}{k.phone && k.email ? ' · ' : ''}{k.email ?? ''}</div></div><Pill tone="closed">{k.channel}</Pill></li>)}</ul></Card>
				</div>
			) : null}

			{search.tab === 'assets' ? (
				<Card className="mt-5 overflow-x-auto">
					{assets.length === 0 ? <EmptyState title="No assets recorded" action={<Link to="/$org/assets" params={{ org: org.slug }} search={{}}><Button variant="primary">Open inventory</Button></Link>}>Assets added in the inventory with this client will appear here.</EmptyState> : (
						<table className="w-full text-[13px]"><thead><tr className="bg-muted text-left text-[11px] font-semibold tracking-wider text-t2 uppercase"><th className="px-4 py-3">Tag</th><th className="px-4 py-3">Asset</th><th className="px-4 py-3">Site</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Warranty</th><th className="px-4 py-3">Open</th></tr></thead>
							<tbody>{assets.map((a) => <tr key={a.tag} className="cursor-pointer border-t border-border hover:bg-[#fafbfc]" onClick={() => navigate({ to: '/$org/assets', params: { org: org.slug }, search: { asset: a.tag, client: client.id } })}><td className="px-4 py-3 font-mono text-xs text-t2">{a.tag}</td><td className="px-4 py-3"><b>{a.name}</b><div className="text-xs text-t2">{a.detail}</div></td><td className="px-4 py-3">{a.site}</td><td className="px-4 py-3"><Pill tone={a.status === 'Healthy' || a.status === 'Active' ? 'done' : a.status === 'Down' ? 'blocked' : a.status === 'In stock' ? 'closed' : 'open'}>{a.statusDetail ?? a.status}</Pill></td><td className={cn('px-4 py-3', a.warrantyAt - now < 90 * 86_400_000 && 'font-semibold text-high-fg')}>{fmtDate(a.warrantyAt)}</td><td className="px-4 py-3">{a.openTicketKey ? <button type="button" onClick={(e) => { e.stopPropagation(); setSearch({ panel: a.openTicketKey }); }} className="font-mono text-xs text-danger-fg hover:underline">{a.openTicketKey}</button> : '—'}</td></tr>)}</tbody></table>
					)}
				</Card>
			) : null}

			{search.tab === 'contract' ? (
				<Card className="mt-5 p-5">
					<CardHeader title="Contract & SLA" sub="Terms shown on the client portal and used for SLA clocks" action={editContract ? null : <Button size="sm" onClick={() => setEditContract(true)}>Edit</Button>} />
					{editContract ? <ContractEditor client={client} onDone={() => setEditContract(false)} onSave={(patch) => { updateClient(client.id, { contract: { ...client.contract, ...patch } }); setEditContract(false); toast('Contract updated', { tone: 'success' }); }} /> : (
						<dl className="mt-3 grid gap-x-8 gap-y-3 text-[13px] sm:grid-cols-2">
							{[['Plan', client.contract.plan], ['Term', `${fmtDate(client.contract.termStart)} – ${fmtDate(client.contract.termEnd)}`], ['Monthly fee', formatNaira(client.contract.feeMonthly)], ['Hours included', `${client.contract.hoursIncluded}h · ${formatNaira(client.contract.overageRate)}/h overage`], ['Coverage', client.contract.coverage], ['SLA', client.contract.slaSummary], ['Scope', client.contract.scope], ['Excluded', client.contract.excluded]].map(([k, v]) => <div key={k}><dt className="text-xs text-t2">{k}</dt><dd className="mt-0.5">{v}</dd></div>)}
						</dl>
					)}
				</Card>
			) : null}

			{search.tab === 'invoices' ? (
				<Card className="mt-5 overflow-x-auto">
					{client.invoices.length === 0 ? <EmptyState title="No invoices yet" /> : (
						<table className="w-full text-[13px]"><thead><tr className="bg-muted text-left text-[11px] font-semibold tracking-wider text-t2 uppercase"><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Issued</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3" /></tr></thead>
							<tbody>{client.invoices.map((i) => <tr key={i.id} className="border-t border-border"><td className="px-4 py-3 font-mono text-xs">{i.number}</td><td className="px-4 py-3">{i.label}</td><td className="px-4 py-3 text-t2">{fmtDate(i.issuedAt)}</td><td className={cn('px-4 py-3', i.status === 'Overdue' && 'font-semibold text-high-fg')}>{fmtDate(i.dueAt)}</td><td className="tabular px-4 py-3 font-semibold">{formatNaira(i.amount)}</td><td className="px-4 py-3"><Pill tone={i.status === 'Paid' ? 'done' : i.status === 'Overdue' ? 'blocked' : 'open'}>{i.status}</Pill></td><td className="px-4 py-3 text-right">{i.status !== 'Paid' ? <span className="flex justify-end gap-2"><Button size="sm" onClick={() => toast('Reminder sent', { tone: 'success', description: `WhatsApp + email to ${client.contacts.find((k) => k.channel === 'email')?.name ?? 'finance'}` })}>Remind</Button><Button size="sm" variant="soft" onClick={() => { setInvoiceStatus(client.id, i.id, 'Paid'); toast(`${i.number} marked paid`, { tone: 'success' }); }}>Mark paid</Button></span> : <Button size="sm" variant="ghost" onClick={() => toast(`Downloading ${i.number}.pdf`)}>PDF</Button>}</td></tr>)}</tbody></table>
					)}
				</Card>
			) : null}

			{search.tab === 'visits' ? (
				<Card className="mt-5 overflow-x-auto">
					{visits.length === 0 ? <EmptyState title="No visits" action={<Link to="/$org/visits" params={{ org: org.slug }} search={{ client: client.id }}><Button variant="primary">Schedule a visit</Button></Link>} /> : (
						<table className="w-full text-[13px]"><thead><tr className="bg-muted text-left text-[11px] font-semibold tracking-wider text-t2 uppercase"><th className="px-4 py-3">Ticket</th><th className="px-4 py-3">Visit</th><th className="px-4 py-3">Site</th><th className="px-4 py-3">Engineer</th><th className="px-4 py-3">When</th><th className="px-4 py-3">Status</th></tr></thead>
							<tbody>{visits.map((v) => <tr key={v.id} className="cursor-pointer border-t border-border hover:bg-[#fafbfc]" onClick={() => navigate({ to: '/$org/visits', params: { org: org.slug }, search: { visit: v.id } })}><td className="px-4 py-3 font-mono text-xs text-t2">{v.ticketKey}</td><td className="px-4 py-3"><b>{v.title}</b></td><td className="px-4 py-3">{v.site}</td><td className="px-4 py-3">{memberById(v.engineerId)?.name ?? <span className="text-t2">Unassigned</span>}</td><td className="px-4 py-3 text-t2">{v.startAt ? new Date(v.startAt).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : v.window ?? '—'}</td><td className="px-4 py-3"><Pill tone={v.status === 'Done' ? 'done' : v.status === 'On site' ? 'done' : v.status === 'En route' ? 'teal' : v.status === 'Scheduled' ? 'progress' : 'open'}>{v.status}</Pill></td></tr>)}</tbody></table>
					)}
				</Card>
			) : null}

			{search.tab === 'notes' ? (
				<div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px] [&>*]:min-w-0">
					<Card className="p-5"><CardHeader title="Account notes" sub="Internal, never shown to the client" /><ul className="mt-3 space-y-3">{client.notes.length === 0 ? <li className="text-[13px] text-t3">No notes yet.</li> : client.notes.map((n) => <li key={n.id} className="rounded-[10px] bg-muted px-3.5 py-3 text-[13px]"><div className="mb-1 text-xs text-t2"><b className="text-t1">{n.authorName}</b> · {relativeTime(n.at, now)}</div>{n.body}</li>)}</ul></Card>
					<Card className="p-5"><CardHeader title="Add a note" /><div className="mt-3"><NoteComposer clientId={client.id} /></div></Card>
				</div>
			) : null}

			<AddSiteDialog open={siteDialog} onClose={() => setSiteDialog(false)} clientId={client.id} />
			<AddContactDialog open={contactDialog} onClose={() => setContactDialog(false)} clientId={client.id} />
			<CreateTicketDialog open={creating} onClose={() => setCreating(false)} defaultProjectKey="KS" onCreated={(key) => setSearch({ panel: key })} />
			{search.panel ? <TicketDetail ticketKey={search.panel} orgSlug={org.slug} onClose={() => setSearch({ panel: undefined })} /> : null}
		</AppShell>
	);
}

function ContractEditor({ client, onDone, onSave }: { client: { contract: { plan: string; feeMonthly: number; hoursIncluded: number; overageRate: number; coverage: string; slaSummary: string; scope: string; excluded: string } }; onDone: () => void; onSave: (patch: Partial<typeof client.contract>) => void }) {
	const [c, setC] = useState(client.contract);
	return (
		<div className="mt-3 grid gap-4 sm:grid-cols-2">
			<Field label="Plan">{(id) => <Input id={id} value={c.plan} onChange={(e) => setC({ ...c, plan: e.target.value })} />}</Field>
			<Field label="Monthly fee (₦)">{(id) => <Input id={id} type="number" value={c.feeMonthly} onChange={(e) => setC({ ...c, feeMonthly: Number(e.target.value) })} />}</Field>
			<Field label="Hours included">{(id) => <Input id={id} type="number" value={c.hoursIncluded} onChange={(e) => setC({ ...c, hoursIncluded: Number(e.target.value) })} />}</Field>
			<Field label="Overage rate (₦/h)">{(id) => <Input id={id} type="number" value={c.overageRate} onChange={(e) => setC({ ...c, overageRate: Number(e.target.value) })} />}</Field>
			<Field label="Coverage">{(id) => <Input id={id} value={c.coverage} onChange={(e) => setC({ ...c, coverage: e.target.value })} />}</Field>
			<Field label="SLA summary">{(id) => <Input id={id} value={c.slaSummary} onChange={(e) => setC({ ...c, slaSummary: e.target.value })} />}</Field>
			<Field label="Scope" className="sm:col-span-2">{(id) => <Textarea id={id} rows={2} value={c.scope} onChange={(e) => setC({ ...c, scope: e.target.value })} />}</Field>
			<Field label="Excluded" className="sm:col-span-2">{(id) => <Textarea id={id} rows={2} value={c.excluded} onChange={(e) => setC({ ...c, excluded: e.target.value })} />}</Field>
			<div className="flex justify-end gap-2 sm:col-span-2"><Button variant="ghost" onClick={onDone}>Cancel</Button><Button variant="primary" onClick={() => onSave(c)}>Save contract</Button></div>
		</div>
	);
}
