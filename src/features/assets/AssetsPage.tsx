import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Cpu, Lock, Monitor, MoreHorizontal, Plus, Printer, QrCode, Search, Server, Ticket as TicketIcon, Upload, Wifi, X, Zap, Pencil, Trash2 } from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import { Button, Card, DarkChips, Dialog, EmptyState, Field, FilterChip, Input, Menu, Pill, PillTabs, Select } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { useNow } from '@/shared/lib/time';
import { toast } from '@/shared/lib/toast-store';
import { useDb } from '@/mocks/db';
import type { Asset, AssetCategory, AssetStatus } from '@/mocks/types';
import { CreateTicketDialog } from '@/features/tickets/components/CreateTicketDialog';
import { TicketDetail } from '@/features/tickets/components/TicketDetail';
import { assetTabLabels, assetTabs, categoryLabel, statusTone, type AssetsSearch, type AssetTab } from './model';

const catIcon: Record<AssetCategory, typeof Cpu> = { endpoint: Monitor, network: Wifi, server: Server, power: Zap, licence: Lock, pos: Cpu };
const fmtMonth = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
const fmtDate = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

function matchesTab(a: Asset, tab: AssetTab, now: number) {
	if (tab === 'all') return true;
	if (tab === 'warranty') return a.warrantyAt - now < 90 * 86_400_000;
	if (tab === 'endpoint') return a.category === 'endpoint' || a.category === 'pos';
	return a.category === tab;
}

/** Deterministic QR-looking pattern from the tag. */
function QrGlyph({ seed, size = 108 }: { seed: string; size?: number }) {
	const n = 17;
	let h = 0;
	for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
	const cells: boolean[] = [];
	for (let i = 0; i < n * n; i++) { h = (h * 1103515245 + 12345) >>> 0; cells.push((h >>> 16) % 3 === 0); }
	const finder = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
	return (
		<svg width={size} height={size} viewBox={`0 0 ${n} ${n}`} className="rounded-sm border border-border bg-white p-1" aria-label={`QR label ${seed}`} role="img">
			{cells.map((on, i) => { const x = i % n; const y = Math.floor(i / n); const f = finder(x, y); const fill = f ? ((x % (n - 7) <= 6 && y % (n - 7) <= 6) && ((x % 7 === 0 || x % 7 === 6 || y % 7 === 0 || y % 7 === 6) || (x % 7 >= 2 && x % 7 <= 4 && y % 7 >= 2 && y % 7 <= 4))) : on; return fill ? <rect key={i} x={x} y={y} width="1" height="1" fill="#1b2a32" /> : null; })}
		</svg>
	);
}

const assetSchema = z.object({ tag: z.string().trim().min(3, 'Asset tag'), name: z.string().trim().min(2, 'Model / name'), detail: z.string().optional(), serial: z.string().trim().min(2, 'Serial'), category: z.enum(['endpoint', 'network', 'server', 'power', 'licence', 'pos']), clientId: z.string().min(1), site: z.string().trim().min(1, 'Site'), user: z.string().optional(), status: z.enum(['Healthy', 'Degraded', 'Down', 'In stock', 'Active', 'Expiring']), warranty: z.string().min(1, 'Warranty end') });
type AssetForm = z.infer<typeof assetSchema>;

function AddAssetDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (tag: string) => void }) {
	const clients = useDb((s) => s.clientAccounts);
	const assets = useDb((s) => s.assets);
	const addAsset = useDb((s) => s.addAsset);
	const form = useForm<AssetForm>({ resolver: zodResolver(assetSchema), defaultValues: { tag: '', name: '', detail: '', serial: '', category: 'endpoint', clientId: clients[0]?.id ?? '', site: '', user: '', status: 'Healthy', warranty: '' } });
	const submit = form.handleSubmit((v) => {
		if (assets.some((a) => a.tag === v.tag.toUpperCase())) return form.setError('tag', { message: 'Tag already exists' });
		addAsset({ ...v, tag: v.tag.toUpperCase(), detail: v.detail ?? '', agent: v.category === 'licence' ? '—' : 'n/a', warrantyAt: new Date(v.warranty).getTime() });
		toast(`${v.tag.toUpperCase()} added`, { tone: 'success' });
		form.reset();
		onCreated(v.tag.toUpperCase());
		onClose();
	});
	return (
		<Dialog open={open} onClose={onClose} title="Add asset" width="max-w-[640px]" footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Add asset</Button></div>}>
			<form onSubmit={submit} className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-7">
				<Field label="Asset tag" required error={form.formState.errors.tag?.message}>{(id) => <Input id={id} placeholder="LF-LAP-0210" className="font-mono uppercase" {...form.register('tag')} />}</Field>
				<Field label="Category">{(id) => <Select id={id} {...form.register('category')}>{(Object.keys(categoryLabel) as AssetCategory[]).map((c) => <option key={c} value={c}>{categoryLabel[c]}</option>)}</Select>}</Field>
				<Field label="Model / name" required error={form.formState.errors.name?.message} className="sm:col-span-2">{(id) => <Input id={id} placeholder="e.g. Dell Latitude 5540" {...form.register('name')} />}</Field>
				<Field label="Detail">{(id) => <Input id={id} placeholder="i7 · 16GB · Win 11 Pro" {...form.register('detail')} />}</Field>
				<Field label="Serial" required error={form.formState.errors.serial?.message}>{(id) => <Input id={id} className="font-mono" {...form.register('serial')} />}</Field>
				<Field label="Client">{(id) => <Select id={id} {...form.register('clientId')}>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>}</Field>
				<Field label="Site" required error={form.formState.errors.site?.message}>{(id) => <Input id={id} placeholder="Head office" {...form.register('site')} />}</Field>
				<Field label="User / location">{(id) => <Input id={id} {...form.register('user')} />}</Field>
				<Field label="Status">{(id) => <Select id={id} {...form.register('status')}>{(['Healthy', 'Degraded', 'Down', 'In stock', 'Active', 'Expiring'] as AssetStatus[]).map((s) => <option key={s}>{s}</option>)}</Select>}</Field>
				<Field label="Warranty / licence end" required error={form.formState.errors.warranty?.message}>{(id) => <Input id={id} type="date" {...form.register('warranty')} />}</Field>
			</form>
		</Dialog>
	);
}

function AssetPanel({ asset, onClose, onTicket, orgSlug }: { asset: Asset; onClose: () => void; onTicket: () => void; orgSlug: string }) {
	const updateAsset = useDb((s) => s.updateAsset);
	const deleteAsset = useDb((s) => s.deleteAsset);
	const client = useDb((s) => s.clientAccounts.find((c) => c.id === asset.clientId));
	const openTicket = useDb((s) => s.tickets.find((t) => t.key === asset.openTicketKey));
	const now = useNow(60_000);
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState({ name: asset.name, site: asset.site, location: asset.location ?? '', user: asset.user ?? '', status: asset.status, firmware: asset.firmware ?? '' });
	const navigate = useNavigate();
	const save = () => { updateAsset(asset.tag, { ...draft, location: draft.location || undefined, user: draft.user || undefined, firmware: draft.firmware || undefined }, 'Details edited'); setEditing(false); toast('Asset updated', { tone: 'success' }); };
	const rows: [string, React.ReactNode][] = [
		['Client', client ? <Link to="/$org/customers/$clientId" params={{ org: orgSlug, clientId: client.id }} search={{}} className="text-brand-600 hover:underline">{client.name}</Link> : '—'],
		['Site', editing ? <Input value={draft.site} onChange={(e) => setDraft({ ...draft, site: e.target.value })} className="h-8" aria-label="Site" /> : `${asset.site}${asset.location ? ` · ${asset.location}` : ''}`],
		['Serial', <span key="s" className="font-mono">{asset.serial}</span>],
		...(asset.category !== 'licence' ? [['Firmware', editing ? <Input value={draft.firmware} onChange={(e) => setDraft({ ...draft, firmware: e.target.value })} className="h-8" aria-label="Firmware" /> : <>{asset.firmware ?? '—'}{asset.firmwareAvailable ? <button type="button" className="ms-2 text-high-fg hover:underline" onClick={() => { updateAsset(asset.tag, { firmware: asset.firmwareAvailable, firmwareAvailable: undefined }, `Firmware updated to ${asset.firmwareAvailable}`); toast('Firmware update scheduled', { tone: 'success' }); }}>{asset.firmwareAvailable} available</button> : null}</>] as [string, React.ReactNode]] : []),
		...(asset.wan ? [['WAN', asset.wan] as [string, React.ReactNode]] : []),
		['User', editing ? <Input value={draft.user} onChange={(e) => setDraft({ ...draft, user: e.target.value })} className="h-8" aria-label="User" /> : asset.user ?? '—'],
		['Purchased', asset.purchased ?? '—'],
		[asset.category === 'licence' ? 'Expires' : 'Warranty', <span key="w" className={asset.warrantyAt - now < 90 * 86_400_000 ? 'font-semibold text-high-fg' : ''}>{fmtDate(asset.warrantyAt)}</span>],
		['Monitoring', asset.monitoring ?? (asset.agent === '—' ? 'n/a' : asset.agent)],
	];
	return (
		<aside className="card h-max p-5" aria-label={`${asset.tag} details`}>
			<div className="flex items-start gap-4">
				<QrGlyph seed={asset.tag} />
				<div className="min-w-0 flex-1">
					<div className="font-mono text-xs text-t2">{asset.tag}</div>
					{editing ? <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-1 h-8 font-semibold" aria-label="Name" /> : <b className="block text-[15px] font-semibold">{asset.name}</b>}
					<div className="mt-1.5 flex flex-wrap gap-1.5">{editing ? <Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as AssetStatus })} className="h-8 w-40" aria-label="Status">{(['Healthy', 'Degraded', 'Down', 'In stock', 'Active', 'Expiring'] as AssetStatus[]).map((s) => <option key={s}>{s}</option>)}</Select> : <Pill tone={statusTone(asset.status)}>{asset.statusDetail ?? asset.status}{openTicket ? ` · ${openTicket.key} open` : ''}</Pill>}</div>
				</div>
				<button type="button" onClick={onClose} className="text-t3 hover:text-t1" aria-label="Close"><X size={16} /></button>
			</div>
			<div className="mt-4 flex flex-wrap gap-2">
				{editing ? <><Button size="md" variant="primary" onClick={save}>Save</Button><Button size="md" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button></> : <Button size="md" onClick={() => setEditing(true)}><Pencil size={14} aria-hidden /> Edit</Button>}
				<Button size="md" onClick={onTicket}><TicketIcon size={14} aria-hidden /> New ticket</Button>
				<Button size="md" onClick={() => toast(`Label queued for ${asset.tag}`, { description: 'Sent to the Ikeja office label printer.' })}><QrCode size={14} aria-hidden /> Label</Button>
				<Menu align="end" width="w-48" className="ms-auto" trigger={({ toggle, buttonProps }) => <Button size="md" iconOnly onClick={toggle} aria-label="More" {...buttonProps}><MoreHorizontal size={14} /></Button>} items={[
					{ key: 'stock', label: 'Move to stock', onSelect: () => { updateAsset(asset.tag, { status: 'In stock', user: 'Unassigned · spare' }, 'Returned to stock'); toast('Moved to stock'); } },
					{ key: 'tickets', label: 'View tickets for this asset', onSelect: () => navigate({ to: '/$org/tickets', params: { org: orgSlug }, search: { q: asset.tag.split('-')[0] === 'LF' ? asset.name.split(' ')[0] : asset.name.split(' ')[0] } }) },
					{ key: 'delete', label: 'Delete asset', icon: <Trash2 size={14} />, danger: true, onSelect: () => { if (window.confirm(`Delete ${asset.tag}?`)) { deleteAsset(asset.tag); onClose(); toast(`${asset.tag} deleted`); } } },
				]} />
			</div>
			<dl className="mt-4 divide-y divide-border text-[13px]">{rows.map(([k, v]) => <div key={k} className="flex gap-3 py-2.5"><dt className="w-24 shrink-0 text-t2">{k}</dt><dd className="min-w-0 flex-1">{v}</dd></div>)}</dl>
			<h4 className="mt-4 text-[13px] font-semibold">History</h4>
			<ul className="mt-2 divide-y divide-border text-[13px]">{asset.history.map((h, i) => <li key={i} className="flex gap-3 py-2"><span className="w-20 shrink-0 text-xs text-t2">{now - h.at < 86_400_000 ? 'Today' : fmtMonth(h.at)}</span><span>{h.text}</span></li>)}</ul>
		</aside>
	);
}

export function AssetsPage() {
	const org = useAuthStore((s) => s.org)!;
	const navigate = useNavigate();
	const search = useSearch({ from: '/authed/$org/assets' });
	const assets = useDb((s) => s.assets);
	const clients = useDb((s) => s.clientAccounts);
	const addAsset = useDb((s) => s.addAsset);
	const now = useNow(60_000);
	const [adding, setAdding] = useState(false);
	const [ticketFor, setTicketFor] = useState<Asset>();
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const setSearch = (patch: Partial<AssetsSearch>) => navigate({ to: '/$org/assets', params: { org: org.slug }, search: { ...search, ...patch }, replace: true });

	const counts = useMemo(() => Object.fromEntries(assetTabs.map((t) => [t, assets.filter((a) => matchesTab(a, t, now)).length])) as Record<AssetTab, number>, [assets, now]);
	const list = useMemo(
		() => assets.filter((a) => matchesTab(a, search.tab, now)).filter((a) => !search.client || a.clientId === search.client).filter((a) => !search.site || a.site === search.site).filter((a) => !search.status || a.status === search.status).filter((a) => !search.agent || (search.agent === 'installed' ? a.agent === 'Online' || a.agent.startsWith('Offline') : search.agent === 'snmp' ? a.agent === 'SNMP' : a.agent === 'n/a' || a.agent === '—')).filter((a) => !search.q || `${a.tag} ${a.name} ${a.serial} ${a.detail} ${a.user ?? ''}`.toLowerCase().includes(search.q.toLowerCase())),
		[assets, search, now],
	);
	const current = assets.find((a) => a.tag === search.asset);
	const sites = Array.from(new Set(assets.filter((a) => !search.client || a.clientId === search.client).map((a) => a.site)));
	const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? id;

	const importCsv = (file: File) => {
		file.text().then((text) => {
			const rows = text.split(/\r?\n/).map((r) => r.split(',').map((c) => c.trim())).filter((r) => r.length >= 5 && r[0] && !/^tag$/i.test(r[0]!));
			let n = 0;
			rows.forEach((r) => { if (!assets.some((a) => a.tag === r[0]!.toUpperCase())) { addAsset({ tag: r[0]!.toUpperCase(), name: r[1]!, detail: r[2] ?? '', serial: r[3] ?? '', category: (['endpoint', 'network', 'server', 'power', 'licence', 'pos'].includes(r[4]!) ? r[4] : 'endpoint') as AssetCategory, clientId: clients.find((c) => c.name === r[5])?.id ?? clients[0]!.id, site: r[6] ?? 'Head office', status: 'Healthy', agent: 'n/a', warrantyAt: Date.now() + 365 * 86_400_000 }); n++; } });
			toast(`Imported ${n} assets`, { tone: n ? 'success' : 'danger', description: n ? undefined : 'Expected columns: tag, name, detail, serial, category, client, site' });
		});
	};

	const tabs = assetTabs.map((t) => ({ key: t, label: assetTabLabels[t], count: counts[t] }));

	return (
		<AppShell
			meta={{ title: 'Assets', subtitle: `Devices, licences and warranties across ${clients.length} clients` }}
			mobileHeader={<MobileHeader className={search.panel ? 'hidden' : undefined}><div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Assets</h1><button type="button" onClick={() => setAdding(true)} className="flex h-8 items-center gap-1 rounded-full bg-white px-3 text-[13px] font-semibold text-brand-900"><Plus size={14} /> Add</button></div><DarkChips items={tabs.slice(0, 6)} value={search.tab} onChange={(tab) => setSearch({ tab })} className="mt-3" /></MobileHeader>}
		>
			<div className="hidden flex-wrap items-center gap-3 lg:flex">
				<PillTabs items={tabs} value={search.tab} onChange={(tab) => setSearch({ tab })} className="min-w-0 flex-1" ariaLabel="Asset type" />
				<label className="inline-flex"><input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} /><span className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-sm border border-border-strong bg-white px-3.5 text-[13px] font-medium hover:bg-muted"><Upload size={15} aria-hidden /> Import CSV</span></label>
				<Button onClick={() => toast(`${selected.size || list.length} QR labels sent to print`, { tone: 'success' })}><Printer size={15} aria-hidden /> Print QR labels</Button>
				<Button variant="primary" onClick={() => setAdding(true)}><Plus size={15} aria-hidden /> Add asset</Button>
			</div>
			<div className="mt-0 flex flex-wrap items-center gap-2 lg:mt-4">
				<label className="input h-[30px] w-full text-xs lg:w-[300px]"><Search size={13} className="text-t2" aria-hidden /><input value={search.q ?? ''} onChange={(e) => setSearch({ q: e.target.value || undefined })} placeholder="Search tag, serial, model…" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-t3" aria-label="Search assets" /></label>
				<Menu width="w-64" trigger={({ toggle, buttonProps }) => <FilterChip label="Client" value={search.client ? clientName(search.client) : undefined} onClick={toggle} onClear={() => setSearch({ client: undefined, site: undefined })} buttonProps={buttonProps} />} items={clients.map((c) => ({ key: c.id, label: c.name, selected: search.client === c.id, onSelect: () => setSearch({ client: search.client === c.id ? undefined : c.id, site: undefined }) }))} />
				<Menu width="w-56" trigger={({ toggle, buttonProps }) => <FilterChip label="Site" value={search.site} onClick={toggle} onClear={() => setSearch({ site: undefined })} buttonProps={buttonProps} />} items={sites.map((s) => ({ key: s, label: s, selected: search.site === s, onSelect: () => setSearch({ site: search.site === s ? undefined : s }) }))} />
				<Menu width="w-44" trigger={({ toggle, buttonProps }) => <FilterChip label="Status" value={search.status} onClick={toggle} onClear={() => setSearch({ status: undefined })} buttonProps={buttonProps} />} items={(['Healthy', 'Degraded', 'Down', 'In stock', 'Active', 'Expiring'] as const).map((s) => ({ key: s, label: s, selected: search.status === s, onSelect: () => setSearch({ status: search.status === s ? undefined : s }) }))} />
				<Menu width="w-44" trigger={({ toggle, buttonProps }) => <FilterChip label="Agent" value={search.agent ? { installed: 'Installed', snmp: 'SNMP', none: 'None' }[search.agent] : undefined} onClick={toggle} onClear={() => setSearch({ agent: undefined })} buttonProps={buttonProps} />} items={[['installed', 'Installed'], ['snmp', 'SNMP'], ['none', 'None']].map(([k, l]) => ({ key: k!, label: l!, selected: search.agent === k, onSelect: () => setSearch({ agent: search.agent === k ? undefined : k }) }))} />
			</div>

			<div className={cn('mt-4 grid gap-4 [&>*]:min-w-0', current && 'xl:grid-cols-[minmax(0,1fr)_420px]')}>
				<Card className="overflow-x-auto" data-tour="m-assets">
					{list.length === 0 ? <EmptyState icon={<Cpu size={20} />} title="No assets match" action={<Button variant="primary" onClick={() => setAdding(true)}>Add asset</Button>} /> : (
						<table className="w-full text-[13px]">
							<thead><tr className="bg-muted text-left text-[11px] font-semibold tracking-wider text-t2 uppercase"><th className="hidden w-10 px-3.5 py-3 lg:table-cell"><input type="checkbox" className="size-4 accent-brand-900" checked={list.every((a) => selected.has(a.tag))} onChange={() => setSelected(list.every((a) => selected.has(a.tag)) ? new Set() : new Set(list.map((a) => a.tag)))} aria-label="Select all" /></th><th className="px-3.5 py-3">Tag</th><th className="px-3.5 py-3">Asset</th><th className="hidden px-3.5 py-3 md:table-cell">Site · User</th><th className="px-3.5 py-3">Status</th><th className="hidden px-3.5 py-3 lg:table-cell">Agent</th><th className="hidden px-3.5 py-3 md:table-cell">Warranty</th><th className="hidden px-3.5 py-3 lg:table-cell">Open</th></tr></thead>
							<tbody>
								{list.map((a) => { const Icon = catIcon[a.category]; const soon = a.warrantyAt - now < 90 * 86_400_000; return (
									<tr key={a.tag} className={cn('cursor-pointer border-t border-border hover:bg-[#fafbfc]', search.asset === a.tag && 'bg-brand-100/40')} onClick={() => setSearch({ asset: a.tag })}>
										<td className="hidden px-3.5 py-3 lg:table-cell" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="size-4 accent-brand-900" checked={selected.has(a.tag)} onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(a.tag)) n.delete(a.tag); else n.add(a.tag); return n; })} aria-label={`Select ${a.tag}`} /></td>
										<td className="px-3.5 py-3 font-mono text-xs text-t2">{a.tag}</td>
										<td className="px-3.5 py-3"><div className="flex items-center gap-2.5"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-900"><Icon size={14} /></span><div><b>{a.name}</b><div className="text-xs text-t2">{a.detail}</div></div></div></td>
										<td className="hidden px-3.5 py-3 md:table-cell"><div>{a.site}</div><div className="text-xs text-t2">{a.location ?? a.user ?? ''}</div></td>
										<td className="px-3.5 py-3"><Pill tone={statusTone(a.status)}>{a.statusDetail ?? a.status}</Pill></td>
										<td className="hidden px-3.5 py-3 lg:table-cell">{a.agent === 'Online' ? <Pill tone="done">Online</Pill> : a.agent.startsWith('Offline') ? <Pill tone="closed">{a.agent}</Pill> : <span className="text-xs text-t2">{a.agent}</span>}</td>
										<td className={cn('hidden px-3.5 py-3 md:table-cell', soon && 'font-semibold text-high-fg')}>{soon ? fmtDate(a.warrantyAt) : fmtMonth(a.warrantyAt)}</td>
										<td className="hidden px-3.5 py-3 lg:table-cell">{a.openTicketKey ? <button type="button" onClick={(e) => { e.stopPropagation(); setSearch({ panel: a.openTicketKey }); }} className="font-mono text-xs text-danger-fg hover:underline">{a.openTicketKey}</button> : <span className="text-t3">—</span>}</td>
									</tr>
								); })}
							</tbody>
						</table>
					)}
				</Card>
				{current ? <div className="hidden xl:block" data-tour="asset-panel"><AssetPanel asset={current} orgSlug={org.slug} onClose={() => setSearch({ asset: undefined })} onTicket={() => setTicketFor(current)} /></div> : null}
			</div>

			<Dialog open={!!current && typeof window !== 'undefined' && window.innerWidth < 1280} onClose={() => setSearch({ asset: undefined })} title={current?.tag} width="max-w-[520px]">{current ? <div className="p-4"><AssetPanel asset={current} orgSlug={org.slug} onClose={() => setSearch({ asset: undefined })} onTicket={() => setTicketFor(current)} /></div> : null}</Dialog>
			<AddAssetDialog open={adding} onClose={() => setAdding(false)} onCreated={(tag) => setSearch({ asset: tag, tab: 'all', q: undefined })} />
			<CreateTicketDialog open={!!ticketFor} onClose={() => setTicketFor(undefined)} defaultProjectKey="KS" defaults={ticketFor ? { clientId: ticketFor.clientId, asset: `${ticketFor.name} · ${ticketFor.tag}`, title: `${ticketFor.name} at ${ticketFor.site}: ` } : undefined} onCreated={(key) => { if (ticketFor) useDb.getState().updateAsset(ticketFor.tag, { openTicketKey: key }, `Ticket ${key} opened`); setSearch({ panel: key }); }} />
			{search.panel ? <TicketDetail ticketKey={search.panel} orgSlug={org.slug} onClose={() => setSearch({ panel: undefined })} /> : null}
		</AppShell>
	);
}
