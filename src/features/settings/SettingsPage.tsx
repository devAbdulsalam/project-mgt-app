import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
	ChevronLeft,
	Copy,
	Download,
	KeyRound,
	Plus,
	Shield,
	Trash2,
	Users,
	Webhook as WebhookIcon,
	Zap,
} from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import {
	Button,
	Card,
	CardHeader,
	Dialog,
	Field,
	Input,
	LabelChip,
	Pill,
	ProgressBar,
	Select,
	Switch,
	Textarea,
} from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { formatNaira, useDb } from '@/mocks/db';
import { toast } from '@/shared/lib/toast-store';
import { formatDateTime, relativeTime, useNow } from '@/shared/lib/time';
import type { AutomationRule, OrgSettings, SlaPolicy } from '@/mocks/types';
import { sectionTitle, settingsSections, type SettingsSection } from './model';
import { useTourStore } from '@/features/tour/store';
import { isLiveApi } from '@/shared/lib/live-api';
import { useTeamMembers } from '@/features/team/hooks/useTeam';
import { LiveApiKeys, LiveSla, NotConnectedNotice, SettingsGate, LiveNotificationPrefs } from './live';
import { LIVE_SECTIONS, useLiveSection } from './hooks/useLiveSettings';
import { MousePointerClick, PlayCircle } from 'lucide-react';

// ---------- helpers ----------

function Row({
	label,
	sub,
	children,
	stacked,
}: {
	label: ReactNode;
	sub?: ReactNode;
	children: ReactNode;
	stacked?: boolean;
}) {
	return (
		<div
			className={cn(
				'grid gap-2 border-b border-border py-4 last:border-b-0',
				!stacked && 'sm:grid-cols-[200px_1fr] sm:gap-6',
			)}
		>
			<div>
				<b className="block text-[13px]">{label}</b>
				{sub ? <span className="text-xs text-t2">{sub}</span> : null}
			</div>
			<div className="min-w-0">{children}</div>
		</div>
	);
}

function SaveBar({
	dirty,
	onSave,
	onDiscard,
}: {
	dirty: boolean;
	onSave: () => void;
	onDiscard: () => void;
}) {
	return (
		<div className="mt-4 flex justify-end gap-3">
			<Button variant="ghost" onClick={onDiscard} disabled={!dirty}>
				Discard
			</Button>
			<Button variant="primary" onClick={onSave} disabled={!dirty}>
				Save changes
			</Button>
		</div>
	);
}

/** Generic editable section: local draft of one settings slice, saved on click. */
function useDraft<K extends keyof OrgSettings>(section: K) {
	const mockValue = useDb((s) => s.settings[section]);
	const setSettings = useDb((s) => s.setSettings);
	// Live, the workspace's own settings replace the store's demo ones.
	const server = useLiveSection(section);
	const value = server ? server.value : mockValue;
	const [draft, setDraft] = useState<OrgSettings[K]>(value);
	const [base, setBase] = useState(value);
	if (base !== value) {
		setBase(value);
		setDraft(value);
	}
	const dirty = JSON.stringify(draft) !== JSON.stringify(value);
	const save = () => {
		if (server) {
			void server.save(draft).then((ok) => ok && toast('Settings saved', { tone: 'success', description: `${sectionTitle(String(section))} updated.` }));
			return;
		}
		setSettings(section, draft);
		toast('Settings saved', {
			tone: 'success',
			description: `${sectionTitle(String(section))} updated · logged to audit.`,
		});
	};
	const discard = () => setDraft(value);
	return { draft, setDraft, dirty, save, discard };
}

// ---------- sections ----------

function General() {
	const {
		draft: g,
		setDraft: setG,
		dirty,
		save,
		discard,
	} = useDraft('general');
	const hours = useDraft('businessHours');
	const patch = (p: Partial<OrgSettings['general']>) => setG({ ...g, ...p });
	const nextKey = useDb((s) => s.nextKey.KS ?? 2051);
	const live = isLiveApi();
	const h = hours.draft;
	return (
		<div className="grid gap-4 xl:grid-cols-[1fr_400px] [&>*]:min-w-0">
			<div>
				<Card className="p-6 mb-4">
					<CardHeader
						title="Workspace"
						sub="How your company appears across the app, portal and client messages."
					/>
					<div className="mt-2">
						<Row label="Logo" sub="PNG/SVG · square">
							<div className="flex items-center gap-3">
								<span className="grid size-16 place-items-center rounded-[14px] bg-brand-900 text-xl font-bold text-white">
									{g.companyName
										.split(/\s+/)
										.slice(0, 2)
										.map((w) => w[0])
										.join('')}
								</span>
								<Button
									size="md"
									onClick={() => toast('Upload a square PNG or SVG up to 1 MB')}
								>
									Upload
								</Button>
								<button
									type="button"
									className="text-[13px] text-t2 hover:underline"
								>
									Remove
								</button>
							</div>
						</Row>
						<Row label="Company name">
							<Input
								value={g.companyName}
								onChange={(e) => patch({ companyName: e.target.value })}
								aria-label="Company name"
							/>
						</Row>
						<Row label="Workspace URL">
							<Input
								value={g.slug}
								readOnly={live}
								onChange={(e) =>
									patch({
										slug: e.target.value
											.toLowerCase()
											.replace(/[^a-z0-9-]/g, ''),
									})
								}
								leading={
									<span className="text-[13px] text-t2">ledgedesk.app/</span>
								}
								className="font-semibold"
								aria-label="Workspace slug"
							/>
							<p className="mt-1.5 text-xs text-t2">
								{live
									? 'The workspace URL is fixed: it is part of every link.'
									: `Custom domain (support.${g.slug}.ng) available on Enterprise`}
							</p>
						</Row>
						<Row label="Registered details" sub="Shown on invoices">
							<div className="grid gap-2 sm:grid-cols-2">
								<Input
									value={g.rc}
									onChange={(e) => patch({ rc: e.target.value })}
									aria-label="RC number"
								/>
								<Input
									value={g.tin}
									onChange={(e) => patch({ tin: e.target.value })}
									aria-label="TIN"
								/>
							</div>
						</Row>
						<Row label="Head office">
							<Input
								value={g.headOffice}
								onChange={(e) => patch({ headOffice: e.target.value })}
								aria-label="Head office"
							/>
						</Row>
						<Row label="Support contacts" sub="Shown to clients">
							<div className="space-y-2">
								<Input
									value={g.supportPhone}
									onChange={(e) => patch({ supportPhone: e.target.value })}
									aria-label="Support phone"
								/>
								<Input
									value={g.supportEmail}
									onChange={(e) => patch({ supportEmail: e.target.value })}
									aria-label="Support email"
								/>
							</div>
						</Row>
						<Row label="Ticket key prefix">
							<div className="flex items-center gap-3">
								<Input
									value={g.ticketPrefix}
									onChange={(e) =>
										patch({
											ticketPrefix: e.target.value.toUpperCase().slice(0, 4),
										})
									}
									className="w-24 font-mono uppercase"
									aria-label="Ticket prefix"
								/>
								<span className="text-[13px] text-t2">
									{live
										? 'Suggested key for new projects · existing keys are unchanged'
										: `Next: ${g.ticketPrefix}-${nextKey} · changing the prefix keeps old keys working`}
								</span>
							</div>
						</Row>
					</div>
					<SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
				</Card>
				<div className="hidden md:block">
					<TourCard />
				</div>
			</div>
			<div className="space-y-4">
				<Card className="p-6">
					<CardHeader title="Region & format" />
					<div className="mt-2">
						<Row stacked label="Timezone">
							<Select
								value={g.timezone}
								onChange={(e) => patch({ timezone: e.target.value })}
								aria-label="Timezone"
							>
								{[
									'Africa/Lagos · West Africa Time (GMT+1)',
									'Africa/Accra · GMT',
									'Africa/Nairobi · East Africa Time (GMT+3)',
									'Asia/Dubai · Gulf Standard Time (GMT+4)',
								].map((t) => (
									<option key={t}>{t}</option>
								))}
							</Select>
						</Row>
						<Row stacked label="Currency & tax">
							<div className="grid grid-cols-2 gap-2">
								<Select
									value={g.currency}
									onChange={(e) => patch({ currency: e.target.value })}
									aria-label="Currency"
								>
									<option>₦ NGN · Naira</option>
									<option>$ USD</option>
									<option>GH₵ GHS</option>
								</Select>
								<Input
									value={`VAT ${g.vatPct}%`}
									onChange={(e) =>
										patch({
											vatPct:
												Number(e.target.value.replace(/[^\d.]/g, '')) || 0,
										})
									}
									aria-label="VAT"
								/>
							</div>
						</Row>
						<Row stacked label="Date & number format">
							<div className="grid grid-cols-2 gap-2">
								<Select
									value={g.dateFormat}
									onChange={(e) => patch({ dateFormat: e.target.value })}
									aria-label="Date format"
								>
									<option>10 Sep 2026 · 24h</option>
									<option>09/10/2026 · 12h</option>
									<option>2026-09-10 · 24h</option>
								</Select>
								<Input
									readOnly
									value="₦1,234,567.00"
									className="bg-muted"
									aria-label="Number format"
								/>
							</div>
						</Row>
						<Row stacked label="Languages" sub="UI + reply templates">
							<div className="flex flex-wrap gap-1.5">
								{[
									'English (NG)',
									'Yoruba',
									'Hausa',
									'Igbo',
									'Pidgin',
									'French',
								].map((l) => {
									const on = g.languages.includes(l);
									return (
										<button
											key={l}
											type="button"
											onClick={() =>
												patch({
													languages: on
														? g.languages.filter((x) => x !== l)
														: [...g.languages, l],
												})
											}
											className={cn(
												'rounded-sm px-3 py-1.5 text-[13px]',
												on
													? 'bg-brand-100 font-medium text-brand-900'
													: 'border border-border-strong text-t2 hover:bg-muted',
											)}
											aria-pressed={on}
										>
											{l}
										</button>
									);
								})}
							</div>
						</Row>
					</div>
				</Card>
				<Card className="p-6">
					<CardHeader
						title="Business hours"
						sub="SLA clocks run during these hours unless a policy is 24/7. Public holidays pause the clock."
						action={
							<Button
								size="sm"
								onClick={() =>
									toast('12 public holidays loaded from the NG calendar', {
										description: 'Next: 1 Oct · Independence Day',
									})
								}
							>
								Holidays (12)
							</Button>
						}
					/>
					<div className="mt-3 space-y-3 text-[13px]">
						{(
							[
								['weekdays', 'Mon – Fri'],
								['saturday', 'Saturday'],
								['sunday', 'Sunday'],
							] as const
						).map(([k, label]) => (
							<div
								key={k}
								className="grid grid-cols-[80px_1fr_1fr_44px] items-center gap-2"
							>
								<b>{label}</b>
								<Input
									type="time"
									value={h[k].from}
									disabled={!h[k].on}
									onChange={(e) =>
										hours.setDraft({
											...h,
											[k]: { ...h[k], from: e.target.value },
										})
									}
									aria-label={`${label} from`}
								/>
								<Input
									type="time"
									value={h[k].to}
									disabled={!h[k].on}
									onChange={(e) =>
										hours.setDraft({
											...h,
											[k]: { ...h[k], to: e.target.value },
										})
									}
									aria-label={`${label} to`}
								/>
								<Switch
									on={h[k].on}
									onChange={(v) =>
										hours.setDraft({
											...h,
											[k]: {
												...h[k],
												on: v,
												from: v ? h[k].from || '09:00' : '',
												to: v ? h[k].to || '17:00' : '',
											},
										})
									}
									label={label}
								/>
							</div>
						))}
						<p className="text-xs text-t2">
							Next holiday: 1 Oct · Independence Day · P1 24/7 coverage still
							applies
						</p>
					</div>
					<SaveBar
						dirty={hours.dirty}
						onSave={hours.save}
						onDiscard={hours.discard}
					/>
				</Card>
				<div className=" md:hidden">
					<TourCard />
				</div>
			</div>
		</div>
	);
}

function TourCard() {
	const startInteractive = useTourStore((s) => s.startInteractive);
	const startVideo = useTourStore((s) => s.startVideo);
	const completedAt = useTourStore((s) => s.completedAt);
	const videoWatchedAt = useTourStore((s) => s.videoWatchedAt);
	const maxStep = useTourStore((s) => s.maxStep);
	const dontShowAgain = useTourStore((s) => s.dontShowAgain);
	const setDontShowAgain = useTourStore((s) => s.setDontShowAgain);
	const fmt = (ts?: number) =>
		ts
			? new Date(ts).toLocaleDateString('en-GB', {
					day: 'numeric',
					month: 'short',
				})
			: undefined;
	return (
		<Card className="p-6" data-tour="settings-tour">
			<CardHeader
				title="App tour"
				sub="Learn or re-learn the workspace. New teammates see this on their first sign-in."
			/>
			<div className="mt-4 flex flex-wrap gap-2">
				<Button
					variant="primary"
					onClick={() => startInteractive(completedAt ? 0 : maxStep)}
				>
					<MousePointerClick size={15} aria-hidden />{' '}
					{completedAt
						? 'Replay clickable tour'
						: maxStep > 0
							? `Resume tour (step ${maxStep + 1})`
							: 'Take the clickable tour'}
				</Button>
				<Button onClick={startVideo}>
					<PlayCircle size={15} aria-hidden /> Watch the video
				</Button>
			</div>
			<ul className="mt-3 space-y-1 text-xs text-t2">
				<li>
					Clickable tour:{' '}
					{completedAt
						? `completed ${fmt(completedAt)}`
						: maxStep > 0
							? `${maxStep + 1} of 25 steps seen`
							: 'not started'}
				</li>
				<li>
					Video:{' '}
					{videoWatchedAt ? `watched ${fmt(videoWatchedAt)}` : 'not watched'}
				</li>
			</ul>
			<label className="mt-3 flex items-center gap-2 text-[13px]">
				<Switch
					size="sm"
					on={!dontShowAgain}
					onChange={(v) => setDontShowAgain(!v)}
					label="Offer the tour on sign-in"
				/>{' '}
				Offer the tour on sign-in
			</label>
		</Card>
	);
}

function Branding() {
	const { draft: b, setDraft, dirty, save, discard } = useDraft('branding');
	const patch = (p: Partial<OrgSettings['branding']>) =>
		setDraft({ ...b, ...p });
	return (
		<Card className="p-6">
			<CardHeader
				title="Branding"
				sub="Colours and names used on the client portal, emails and WhatsApp templates."
			/>
			<div className="mt-2">
				<Row label="Accent colour">
					<div className="flex flex-wrap items-center gap-2">
						{[
							'#1e3a47',
							'#2e6f86',
							'#22a05b',
							'#6b3fa0',
							'#b45309',
							'#d93f3f',
						].map((c) => (
							<button
								key={c}
								type="button"
								onClick={() => patch({ accent: c })}
								className={cn(
									'size-8 rounded-full ring-2 ring-offset-2',
									b.accent === c ? 'ring-t1' : 'ring-transparent',
								)}
								style={{ background: c }}
								aria-label={`Accent ${c}`}
								aria-pressed={b.accent === c}
							/>
						))}
						<Input
							value={b.accent}
							onChange={(e) => patch({ accent: e.target.value })}
							className="w-28 font-mono"
							aria-label="Accent hex"
						/>
					</div>
				</Row>
				<Row label="Logo initials" sub="Used until a logo is uploaded">
					<Input
						value={b.logoInitials}
						onChange={(e) =>
							patch({ logoInitials: e.target.value.toUpperCase().slice(0, 3) })
						}
						className="w-24 font-semibold uppercase"
						aria-label="Logo initials"
					/>
				</Row>
				<Row label="Portal name">
					<Input
						value={b.portalName}
						onChange={(e) => patch({ portalName: e.target.value })}
						aria-label="Portal name"
					/>
				</Row>
				<Row label="Portal tagline">
					<Input
						value={b.portalTagline}
						onChange={(e) => patch({ portalTagline: e.target.value })}
						aria-label="Portal tagline"
					/>
				</Row>
				<Row label="Email footer">
					<Textarea
						rows={2}
						value={b.emailFooter}
						onChange={(e) => patch({ emailFooter: e.target.value })}
						aria-label="Email footer"
					/>
				</Row>
				<Row label="Preview">
					<div className="rounded-[10px] border border-border p-4">
						<div className="flex items-center gap-2">
							<span
								className="grid size-8 place-items-center rounded-full text-xs font-bold text-white"
								style={{ background: b.accent }}
							>
								{b.logoInitials}
							</span>
							<b>{b.portalName}</b>
						</div>
						<p className="mt-2 text-[13px] text-t2">{b.portalTagline}</p>
						<button
							type="button"
							className="mt-3 rounded-sm px-3 py-1.5 text-[13px] font-medium text-white"
							style={{ background: b.accent }}
						>
							New request
						</button>
					</div>
				</Row>
			</div>
			<SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
		</Card>
	);
}

function TeamRoles({ orgSlug }: { orgSlug: string }) {
	const members = useTeamMembers();
	const active = members.filter((m) => m.status === 'Active');
	return (
		<Card className="p-6">
			<CardHeader
				title="Team & roles"
				sub="Members, invitations and the permission matrix live on the Team pages."
			/>
			<div className="mt-4 grid gap-3 sm:grid-cols-3">
				<div className="rounded-[10px] bg-muted p-4">
					<div className="text-xs text-t2">Active members</div>
					<b className="tabular text-2xl">{active.length}</b>
				</div>
				<div className="rounded-[10px] bg-muted p-4">
					<div className="text-xs text-t2">Invited</div>
					<b className="tabular text-2xl">
						{members.filter((m) => m.status === 'Invited').length}
					</b>
				</div>
				<div className="rounded-[10px] bg-muted p-4">
					<div className="text-xs text-t2">Admins</div>
					<b className="tabular text-2xl">
						{
							active.filter(
								(m) => m.accessRole === 'owner' || m.accessRole === 'admin' || m.role === 'Admin' || m.role === 'Super Admin',
							).length
						}
					</b>
				</div>
			</div>
			<div className="mt-4 flex gap-2">
				<Link to="/$org/users" params={{ org: orgSlug }} search={{}}>
					<Button variant="primary">
						<Users size={15} aria-hidden /> Manage team
					</Button>
				</Link>
				<Link to="/$org/users/roles" params={{ org: orgSlug }}>
					<Button>
						<Shield size={15} aria-hidden /> Roles &amp; permissions
					</Button>
				</Link>
			</div>
		</Card>
	);
}

function Billing() {
	const b = useDb((s) => s.settings.billing);
	const update = useDb((s) => s.updateSettings);
	const now = useNow(60_000);
	const invoices = [
		{
			n: 'LD-2026-09',
			label: 'Growth · 12 seats · Sep 2026',
			amount: b.seats * b.pricePerSeat * 1.075,
			status: 'Paid',
		},
		{
			n: 'LD-2026-08',
			label: 'Growth · 12 seats · Aug 2026',
			amount: b.seats * b.pricePerSeat * 1.075,
			status: 'Paid',
		},
		{
			n: 'LD-2026-07',
			label: 'Growth · 11 seats · Jul 2026',
			amount: 11 * b.pricePerSeat * 1.075,
			status: 'Paid',
		},
	];
	return (
		<div className="grid gap-4 xl:grid-cols-[1fr_380px] [&>*]:min-w-0">
			<div className="space-y-4">
				<Card className="p-6">
					<CardHeader
						title="Plan"
						sub="Billed monthly in naira · 7.5% VAT"
						action={<Pill tone="teal">{b.plan}</Pill>}
					/>
					<div className="mt-4 flex flex-wrap items-end gap-6">
						<div>
							<div className="text-xs text-t2">Monthly</div>
							<b className="tabular text-2xl">
								{formatNaira(b.seats * b.pricePerSeat)}
							</b>
							<span className="text-xs text-t2"> + VAT</span>
						</div>
						<div>
							<div className="text-xs text-t2">Seats</div>
							<div className="flex items-center gap-2">
								<Button
									size="sm"
									iconOnly
									onClick={() =>
										update('billing', { seats: Math.max(1, b.seats - 1) })
									}
									aria-label="Remove seat"
								>
									−
								</Button>
								<b className="tabular text-xl">{b.seats}</b>
								<Button
									size="sm"
									iconOnly
									onClick={() => update('billing', { seats: b.seats + 1 })}
									aria-label="Add seat"
								>
									+
								</Button>
							</div>
						</div>
						<div>
							<div className="text-xs text-t2">Renews</div>
							<b>
								{new Date(b.renewsAt).toLocaleDateString('en-GB', {
									day: 'numeric',
									month: 'short',
									year: 'numeric',
								})}
							</b>{' '}
							<span className="text-xs text-t2">
								· in {Math.round((b.renewsAt - now) / 86_400_000)} days
							</span>
						</div>
					</div>
					<div className="mt-4 flex gap-2">
						<Button
							onClick={() =>
								toast(
									'Enterprise includes SSO, audit export and a dedicated manager',
									{ description: 'Sales will call within one working day.' },
								)
							}
						>
							Compare plans
						</Button>
						<Button
							variant="ghost"
							onClick={() =>
								toast('Downgrade scheduled for the next renewal', {
									tone: 'danger',
								})
							}
						>
							Downgrade
						</Button>
					</div>
				</Card>
				<Card className="p-6">
					<CardHeader title="Payment method" />
					<div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
						<span className="rounded-sm border border-border px-3 py-2">
							{b.paymentMethod}
						</span>
						<Button
							size="md"
							onClick={() =>
								toast('Add a card, bank transfer mandate or USSD', {
									description:
										'Paystack checkout opens in the demo build only.',
								})
							}
						>
							Change
						</Button>
					</div>
					<p className="mt-2 text-xs text-t2">
						Card · bank transfer · USSD (*737#) accepted. Receipts go to
						billing@{useDb.getState().settings.general.slug}systems.ng.
					</p>
				</Card>
				<Card className="overflow-x-auto">
					<table className="w-full text-[13px]">
						<thead>
							<tr className="bg-muted text-left text-[11px] font-semibold tracking-wider text-t2 uppercase">
								<th className="px-5 py-3">Invoice</th>
								<th className="px-5 py-3">Description</th>
								<th className="px-5 py-3">Amount (incl. VAT)</th>
								<th className="px-5 py-3">Status</th>
								<th className="px-5 py-3" />
							</tr>
						</thead>
						<tbody>
							{invoices.map((i) => (
								<tr key={i.n} className="border-t border-border">
									<td className="px-5 py-3 font-mono text-xs">{i.n}</td>
									<td className="px-5 py-3">{i.label}</td>
									<td className="tabular px-5 py-3">
										{formatNaira(Math.round(i.amount))}
									</td>
									<td className="px-5 py-3">
										<Pill tone="done">{i.status}</Pill>
									</td>
									<td className="px-5 py-3 text-right">
										<Button
											size="sm"
											variant="ghost"
											onClick={() => toast(`Downloading ${i.n}.pdf`)}
										>
											<Download size={13} /> PDF
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</Card>
			</div>
			<Card className="h-max p-6">
				<CardHeader title="Usage this month" />
				<div className="mt-4 space-y-4 text-[13px]">
					{[
						[
							'WhatsApp conversations',
							b.usage.whatsappConversations,
							b.usage.whatsappLimit,
							'',
						],
						['SMS', b.usage.sms, b.usage.smsLimit, ''],
						['Storage', b.usage.storageGb, b.usage.storageLimit, ' GB'],
					].map(([l, v, max, unit]) => (
						<div key={l as string}>
							<div className="flex justify-between">
								<span>{l as string}</span>
								<b className="tabular">
									{(v as number).toLocaleString()}
									{unit as string} / {(max as number).toLocaleString()}
									{unit as string}
								</b>
							</div>
							<ProgressBar
								value={((v as number) / (max as number)) * 100}
								color={
									(v as number) / (max as number) > 0.8 ? '#e0a100' : undefined
								}
								className="mt-1.5"
								label={l as string}
							/>
						</div>
					))}
					<p className="text-xs text-t2">
						Overage: ₦25 per WhatsApp conversation · ₦4 per SMS.
					</p>
				</div>
			</Card>
		</div>
	);
}

function Security() {
	const { draft: s, setDraft, dirty, save, discard } = useDraft('security');
	const patch = (p: Partial<OrgSettings['security']>) =>
		setDraft({ ...s, ...p });
	const members = useDb((s2) => s2.members);
	return (
		<div className="grid gap-4 xl:grid-cols-[1fr_380px] [&>*]:min-w-0">
			<Card className="p-6">
				<CardHeader title="Security & SSO" />
				<div className="mt-2">
					<Row
						label="Two-step verification"
						sub="Require an authenticator or WhatsApp/SMS code"
					>
						<div className="flex items-center gap-3">
							<Switch
								on={s.enforce2fa}
								onChange={(v) => patch({ enforce2fa: v })}
								label="Enforce 2FA"
							/>
							<span className="text-[13px] text-t2">
								{s.enforce2fa ? 'Enforced for everyone' : 'Optional'} ·{' '}
								{members.filter((m) => m.signIn?.includes('2FA on')).length} of{' '}
								{members.filter((m) => m.status === 'Active').length} enrolled
							</span>
						</div>
					</Row>
					<Row label="Session length" sub="Hours before re-authentication">
						<Select
							value={String(s.sessionHours)}
							onChange={(e) => patch({ sessionHours: Number(e.target.value) })}
							className="w-40"
							aria-label="Session length"
						>
							{[4, 8, 12, 24, 168].map((h) => (
								<option key={h} value={h}>
									{h < 24 ? `${h} hours` : h === 24 ? '1 day' : '7 days'}
								</option>
							))}
						</Select>
					</Row>
					<Row label="Password policy">
						<div className="flex items-center gap-3">
							<Input
								type="number"
								min={8}
								max={32}
								value={s.passwordMinLength}
								onChange={(e) =>
									patch({ passwordMinLength: Number(e.target.value) })
								}
								className="w-24"
								aria-label="Minimum length"
							/>
							<span className="text-[13px] text-t2">
								characters minimum · mixed case and a number required
							</span>
						</div>
					</Row>
					<Row
						label="Single sign-on"
						sub="Users with this domain sign in with the provider"
					>
						<div className="grid gap-2 sm:grid-cols-2">
							<Select
								value={s.ssoProvider}
								onChange={(e) => patch({ ssoProvider: e.target.value })}
								aria-label="SSO provider"
							>
								<option>Google Workspace</option>
								<option>Microsoft Entra ID</option>
								<option>Okta</option>
								<option>None</option>
							</Select>
							<Input
								value={s.ssoDomain}
								onChange={(e) => patch({ ssoDomain: e.target.value })}
								aria-label="SSO domain"
							/>
						</div>
					</Row>
					<Row label="IP allow-list" sub="Optional · one CIDR per line">
						<Textarea
							rows={2}
							value={s.ipAllowlist}
							onChange={(e) => patch({ ipAllowlist: e.target.value })}
							placeholder="e.g. 197.210.0.0/16"
							aria-label="IP allow-list"
						/>
					</Row>
				</div>
				<SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
			</Card>
			<Card className="h-max p-6">
				<CardHeader title="Active sessions" />
				<ul className="mt-3 divide-y divide-border text-[13px]">
					{[
						['This browser · Lagos', 'now', true],
						['Engineer app · iPhone · Chinedu', '3 min ago', false],
						['Chrome · Abuja · Amina', '35 min ago', false],
					].map(([l, t, cur]) => (
						<li key={l as string} className="flex items-center gap-3 py-2.5">
							<span className="min-w-0 flex-1">
								{l as string}
								<span className="block text-xs text-t2">{t as string}</span>
							</span>
							{cur ? (
								<Pill tone="done">Current</Pill>
							) : (
								<Button
									size="sm"
									variant="ghost"
									onClick={() => toast('Session revoked', { tone: 'success' })}
								>
									Revoke
								</Button>
							)}
						</li>
					))}
				</ul>
				<Button
					className="mt-3"
					onClick={() =>
						toast('Everyone else has been signed out', { tone: 'success' })
					}
				>
					Sign out all other sessions
				</Button>
			</Card>
		</div>
	);
}

function Audit() {
	const tickets = useDb((s) => s.tickets);
	const now = useNow(60_000);
	const [q, setQ] = useState('');
	const rows = tickets
		.flatMap((t) =>
			t.activity.map((a) => ({
				id: `${t.key}-${a.id}`,
				at: a.at,
				actor: a.actorName,
				text: `${a.text} on ${t.key}`,
				system: a.system,
			})),
		)
		.sort((a, b) => b.at - a.at)
		.filter(
			(r) =>
				!q || `${r.actor} ${r.text}`.toLowerCase().includes(q.toLowerCase()),
		)
		.slice(0, 60);
	return (
		<Card className="p-6">
			<CardHeader
				title="Audit log"
				sub="Every change to tickets, settings and roles. Retained 12 months · exportable for NDPR."
				action={
					<Button
						size="sm"
						onClick={() =>
							toast(`Exported ${rows.length} events`, { tone: 'success' })
						}
					>
						<Download size={13} /> Export
					</Button>
				}
			/>
			<Input
				value={q}
				onChange={(e) => setQ(e.target.value)}
				placeholder="Filter by person or action…"
				className="mt-3 h-9"
				aria-label="Filter audit log"
			/>
			<ul className="mt-2 divide-y divide-border text-[13px]">
				{rows.map((r) => (
					<li key={r.id} className="flex items-start gap-3 py-2.5">
						<span
							className="w-[120px] shrink-0 text-xs text-t2"
							title={formatDateTime(r.at)}
						>
							{relativeTime(r.at, now)}
						</span>
						<span
							className={cn(
								'size-2 shrink-0 translate-y-1.5 rounded-full',
								r.system ? 'bg-brand-600' : 'bg-border-strong',
							)}
						/>
						<span>
							<b>{r.actor}</b> {r.text}
						</span>
					</li>
				))}
			</ul>
		</Card>
	);
}

function Channels() {
	const { draft: c, setDraft, dirty, save, discard } = useDraft('channels');
	return (
		<Card className="p-6">
			<CardHeader
				title="Channels"
				sub="Where client requests come from. Each channel creates tickets in the Service desk project."
			/>
			{isLiveApi() && <NotConnectedNotice />}
			<div className="mt-2">
				<Row
					label={
						<span className="flex items-center gap-2">
							WhatsApp Business{' '}
							<Switch
								size="sm"
								on={c.whatsapp.enabled}
								onChange={(v) =>
									setDraft({ ...c, whatsapp: { ...c.whatsapp, enabled: v } })
								}
								label="WhatsApp enabled"
							/>
						</span>
					}
					sub="Two-way, templates, CSAT"
				>
					<div className="grid gap-2 sm:grid-cols-2">
						<Input
							value={c.whatsapp.number}
							onChange={(e) =>
								setDraft({
									...c,
									whatsapp: { ...c.whatsapp, number: e.target.value },
								})
							}
							aria-label="WhatsApp number"
						/>
						<span className="text-[13px] leading-[42px] text-t2">
							{c.whatsapp.templatesApproved} templates approved by Meta
						</span>
					</div>
				</Row>
				<Row
					label={
						<span className="flex items-center gap-2">
							Email{' '}
							<Switch
								size="sm"
								on={c.email.enabled}
								onChange={(v) =>
									setDraft({ ...c, email: { ...c.email, enabled: v } })
								}
								label="Email enabled"
							/>
						</span>
					}
					sub="Inbound mailbox → tickets"
				>
					<div className="grid gap-2 sm:grid-cols-2">
						<Input
							value={c.email.address}
							onChange={(e) =>
								setDraft({
									...c,
									email: { ...c.email, address: e.target.value },
								})
							}
							aria-label="Support address"
						/>
						<Input
							value={c.email.forwardFrom}
							onChange={(e) =>
								setDraft({
									...c,
									email: { ...c.email, forwardFrom: e.target.value },
								})
							}
							aria-label="Forward from"
						/>
					</div>
				</Row>
				<Row
					label={
						<span className="flex items-center gap-2">
							Phone{' '}
							<Switch
								size="sm"
								on={c.phone.enabled}
								onChange={(v) =>
									setDraft({ ...c, phone: { ...c.phone, enabled: v } })
								}
								label="Phone enabled"
							/>
						</span>
					}
					sub="Agents log calls as tickets"
				>
					<div className="flex flex-wrap items-center gap-3">
						<Input
							value={c.phone.number}
							onChange={(e) =>
								setDraft({
									...c,
									phone: { ...c.phone, number: e.target.value },
								})
							}
							className="w-56"
							aria-label="Phone number"
						/>
						<label className="flex items-center gap-2 text-[13px]">
							<Switch
								size="sm"
								on={c.phone.ivr}
								onChange={(v) =>
									setDraft({ ...c, phone: { ...c.phone, ivr: v } })
								}
								label="IVR"
							/>{' '}
							IVR menu (press 1 for P1)
						</label>
					</div>
				</Row>
				<Row
					label={
						<span className="flex items-center gap-2">
							Client portal{' '}
							<Switch
								size="sm"
								on={c.portal.enabled}
								onChange={(v) =>
									setDraft({ ...c, portal: { ...c.portal, enabled: v } })
								}
								label="Portal enabled"
							/>
						</span>
					}
					sub="Clients submit and track requests"
				>
					<div className="flex flex-wrap items-center gap-3">
						<Input
							value={c.portal.url}
							onChange={(e) =>
								setDraft({ ...c, portal: { ...c.portal, url: e.target.value } })
							}
							className="w-72"
							aria-label="Portal URL"
						/>
						<label className="flex items-center gap-2 text-[13px]">
							<Switch
								size="sm"
								on={c.portal.allowGuest}
								onChange={(v) =>
									setDraft({ ...c, portal: { ...c.portal, allowGuest: v } })
								}
								label="Allow guest requests"
							/>{' '}
							Allow guest requests
						</label>
					</div>
				</Row>
			</div>
			<SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
		</Card>
	);
}

function Sla({ orgSlug }: { orgSlug: string }) {
	return isLiveApi() ? <LiveSla /> : <MockSla orgSlug={orgSlug} />;
}

function MockSla({ orgSlug }: { orgSlug: string }) {
	const policies = useDb((s) => s.settings.slaPolicies);
	const updatePolicy = useDb((s) => s.updateSlaPolicy);
	const updateRow = useDb((s) => s.updateSlaRow);
	const setSettings = useDb((s) => s.setSettings);
	const [dirty, setDirty] = useState(false);
	const row = (
		policy: SlaPolicy,
		i: number,
		patch: Partial<SlaPolicy['rows'][number]>,
	) => {
		updateRow(policy.id, i, patch);
		setDirty(true);
	};
	const fmtRes = (h: number) =>
		(h >= 24 ? [h / 24, 'd'] : [h, 'h']) as [number, string];
	const newPolicy = () => {
		const name = window.prompt('Policy name');
		if (!name) return;
		setSettings('slaPolicies', [
			...policies,
			{
				id: `pol_${Date.now()}`,
				plan: 'Bronze',
				name,
				clients: 0,
				p1AllHours: false,
				escalateAt75: false,
				rows: [
					{
						priority: 'P1',
						desc: '',
						responseMin: 60,
						resolveHours: 24,
						coverage: 'Business hours',
						escalation: 'Reminder',
					},
					{
						priority: 'P2 – P4',
						desc: '',
						responseMin: 240,
						resolveHours: 120,
						coverage: 'Business hours',
						escalation: '—',
					},
				],
			},
		]);
		toast(`Policy "${name}" created`, { tone: 'success' });
	};
	return (
		<div>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="text-lg font-semibold">SLA policies</h2>
					<p className="text-[13px] text-t2">
						Response and resolution targets by contract plan and priority.
						Clocks follow business hours unless marked 24/7; "Waiting on client"
						pauses the clock.
					</p>
				</div>
				<div className="flex gap-2">
					<Link to="/$org/reports" params={{ org: orgSlug }} search={{}}>
						<Button>Compliance report</Button>
					</Link>
					<Button variant="primary" onClick={newPolicy}>
						<Plus size={15} aria-hidden /> New policy
					</Button>
				</div>
			</div>
			<div className="mt-4 space-y-4">
				{policies.map((p) => (
					<Card key={p.id} className="overflow-hidden">
						<div className="flex flex-wrap items-center gap-3 px-5 py-3">
							<Pill tone={p.plan === 'Gold' ? 'teal' : 'closed'}>{p.plan}</Pill>
							<b className="text-[15px]">{p.name}</b>
							<span className="text-xs text-t2">
								· {p.clients} clients{p.note ? ` · ${p.note}` : ''}
							</span>
							<div className="ms-auto flex flex-wrap items-center gap-4 text-[13px]">
								<label className="flex items-center gap-2">
									<Switch
										size="sm"
										on={p.p1AllHours}
										onChange={(v) => {
											updatePolicy(p.id, { p1AllHours: v });
											setDirty(true);
										}}
										label="P1 24/7"
									/>{' '}
									P1 24/7
								</label>
								<label className="flex items-center gap-2">
									<Switch
										size="sm"
										on={p.escalateAt75}
										onChange={(v) => {
											updatePolicy(p.id, { escalateAt75: v });
											setDirty(true);
										}}
										label="Escalate at 75%"
									/>{' '}
									Escalate at 75%
								</label>
							</div>
						</div>
						<table className="w-full text-[13px]">
							<thead>
								<tr className="bg-muted text-left text-[11px] font-semibold tracking-wider text-t2 uppercase">
									<th className="px-5 py-2.5">Priority</th>
									<th className="px-3 py-2.5">First response</th>
									<th className="px-3 py-2.5">Resolution</th>
									<th className="px-3 py-2.5">Coverage</th>
									<th className="px-3 py-2.5">Escalation</th>
									<th className="px-5 py-2.5 text-right">Compliance · 30d</th>
								</tr>
							</thead>
							<tbody>
								{p.rows.map((r, i) => {
									const [rv, ru] = fmtRes(r.resolveHours);
									const resp =
										r.responseMin >= 60
											? [r.responseMin / 60, 'h']
											: [r.responseMin, 'min'];
									return (
										<tr key={r.priority} className="border-t border-border">
											<td className="px-5 py-2.5">
												<Pill
													tone={
														r.priority.startsWith('P1')
															? 'critical'
															: r.priority.startsWith('P2')
																? 'high'
																: r.priority.startsWith('P3')
																	? 'medium'
																	: 'low'
													}
												>
													{r.priority}
												</Pill>
												{r.desc ? (
													<span className="ms-2 text-xs text-t2">{r.desc}</span>
												) : null}
											</td>
											<td className="px-3 py-2.5">
												<span className="flex items-center gap-1.5">
													<Input
														type="number"
														min={1}
														value={resp[0] as number}
														onChange={(e) =>
															row(p, i, {
																responseMin:
																	Number(e.target.value) *
																	(resp[1] === 'h' ? 60 : 1),
															})
														}
														className="h-8 w-16"
														aria-label={`${r.priority} response`}
													/>{' '}
													{resp[1]}
												</span>
											</td>
											<td className="px-3 py-2.5">
												<span className="flex items-center gap-1.5">
													<Input
														type="number"
														min={1}
														value={rv}
														onChange={(e) =>
															row(p, i, {
																resolveHours:
																	Number(e.target.value) *
																	(ru === 'd' ? 24 : 1),
															})
														}
														className="h-8 w-16"
														aria-label={`${r.priority} resolution`}
													/>{' '}
													{ru}
												</span>
											</td>
											<td className="px-3 py-2.5 text-t2">
												{p.p1AllHours && r.priority.startsWith('P1')
													? '24/7'
													: r.coverage}
											</td>
											<td className="px-3 py-2.5 text-t2">
												{p.escalateAt75 || r.escalation.includes('50')
													? r.escalation
													: '—'}
											</td>
											<td
												className={cn(
													'tabular px-5 py-2.5 text-right font-semibold',
													r.compliance == null
														? 'text-t3'
														: r.compliance < 90
															? 'text-high-fg'
															: 'text-success-fg',
												)}
											>
												{r.compliance != null ? `${r.compliance}%` : '—'}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</Card>
				))}
				<p className="flex items-center gap-2 text-[13px] text-t2">
					<Zap size={14} className="text-warning" aria-hidden /> Kano Textiles
					Plc (Bronze) has 3 P1 breaches this month — consider moving them to
					Silver at renewal on 30 Sep.
					<Link
						to="/$org/customers/$clientId"
						params={{ org: orgSlug, clientId: 'c_kano' }}
						search={{}}
						className="ms-auto text-brand-600 hover:underline"
					>
						Open client
					</Link>
				</p>
				{dirty ? (
					<div className="flex justify-end">
						<Button
							variant="primary"
							onClick={() => {
								setDirty(false);
								toast('SLA policies saved', {
									tone: 'success',
									description: 'Applies to new tickets immediately.',
								});
							}}
						>
							Save changes
						</Button>
					</div>
				) : null}
			</div>
		</div>
	);
}

function TicketTypes() {
	const types = useDb((s) => s.settings.ticketTypes);
	const setSettings = useDb((s) => s.setSettings);
	const [adding, setAdding] = useState(false);
	const [name, setName] = useState('');
	const [cats, setCats] = useState('');
	return (
		<Card className="p-6">
			<CardHeader
				title="Ticket types & categories"
				sub="Types drive the create form; categories feed reports and automation."
				action={
					<Button size="sm" onClick={() => setAdding(true)}>
						<Plus size={13} /> Add type
					</Button>
				}
			/>
			<ul className="mt-3 divide-y divide-border">
				{types.map((t) => (
					<li
						key={t.id}
						className="flex flex-wrap items-center gap-3 py-3 text-[13px]"
					>
						<Switch
							size="sm"
							on={t.enabled}
							onChange={(v) =>
								setSettings(
									'ticketTypes',
									types.map((x) => (x.id === t.id ? { ...x, enabled: v } : x)),
								)
							}
							label={`${t.name} enabled`}
						/>
						<b className="w-36">{t.name}</b>
						<span className="text-xs text-t2">{t.type}</span>
						<span className="flex flex-wrap gap-1.5">
							{t.categories.map((c) => (
								<LabelChip
									key={c}
									onRemove={() =>
										setSettings(
											'ticketTypes',
											types.map((x) =>
												x.id === t.id
													? {
															...x,
															categories: x.categories.filter((y) => y !== c),
														}
													: x,
											),
										)
									}
								>
									{c}
								</LabelChip>
							))}
							<button
								type="button"
								className="text-xs text-brand-600 hover:underline"
								onClick={() => {
									const c = window.prompt(`New category for ${t.name}`);
									if (c)
										setSettings(
											'ticketTypes',
											types.map((x) =>
												x.id === t.id
													? { ...x, categories: [...x.categories, c] }
													: x,
											),
										);
								}}
							>
								+ category
							</button>
						</span>
					</li>
				))}
			</ul>
			<Dialog
				open={adding}
				onClose={() => setAdding(false)}
				title="Add ticket type"
				width="max-w-[440px]"
				footer={
					<div className="flex justify-end gap-2">
						<Button variant="ghost" onClick={() => setAdding(false)}>
							Cancel
						</Button>
						<Button
							variant="primary"
							onClick={() => {
								if (!name.trim()) return;
								setSettings('ticketTypes', [
									...types,
									{
										id: `tt_${Date.now()}`,
										name: name.trim(),
										type: 'task',
										categories: cats
											.split(',')
											.map((c) => c.trim())
											.filter(Boolean),
										enabled: true,
									},
								]);
								setName('');
								setCats('');
								setAdding(false);
								toast('Ticket type added', { tone: 'success' });
							}}
						>
							Add
						</Button>
					</div>
				}
			>
				<div className="space-y-4 px-5 py-5 sm:px-7">
					<Field label="Name">
						{(id) => (
							<Input
								id={id}
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						)}
					</Field>
					<Field label="Categories" hint="comma separated">
						{(id) => (
							<Input
								id={id}
								value={cats}
								onChange={(e) => setCats(e.target.value)}
							/>
						)}
					</Field>
				</div>
			</Dialog>
		</Card>
	);
}

function Automation() {
	const rules = useDb((s) => s.settings.automation);
	const upsert = useDb((s) => s.upsertAutomation);
	const [editing, setEditing] = useState<AutomationRule>();
	const newRule = () =>
		setEditing({
			id: `au_${Date.now()}`,
			name: '',
			trigger: 'Ticket created',
			condition: '',
			action: '',
			enabled: true,
			runs: 0,
		});
	return (
		<Card className="p-6">
			<CardHeader
				title="Automation"
				sub="Trigger → condition → action. Rules run in order; each run is logged on the ticket."
				action={
					<Button size="sm" onClick={newRule}>
						<Plus size={13} /> New rule
					</Button>
				}
			/>
			{isLiveApi() && <NotConnectedNotice />}
			<ul className="mt-3 divide-y divide-border">
				{rules.map((r) => (
					<li
						key={r.id}
						className="flex flex-wrap items-start gap-3 py-3 text-[13px]"
					>
						<Switch
							size="sm"
							on={r.enabled}
							onChange={(v) => upsert({ ...r, enabled: v })}
							label={`${r.name} enabled`}
						/>
						<div className="min-w-0 flex-1">
							<b className="block">{r.name}</b>
							<span className="text-xs text-t2">
								When <b className="font-medium text-t1">{r.trigger}</b>
								{r.condition ? (
									<>
										{' '}
										and <b className="font-medium text-t1">{r.condition}</b>
									</>
								) : null}{' '}
								→ <b className="font-medium text-t1">{r.action}</b>
							</span>
						</div>
						<span className="tabular text-xs text-t2">
							{r.runs.toLocaleString()} runs
						</span>
						<Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
							Edit
						</Button>
						<Button
							size="sm"
							variant="ghost"
							onClick={() =>
								toast(
									`Dry run: ${r.name} would match ${Math.round(3 + Math.random() * 12)} open tickets`,
									{ description: 'No changes made.' },
								)
							}
						>
							Dry run
						</Button>
					</li>
				))}
			</ul>
			{editing ? (
				<RuleDialog
					rule={editing}
					onClose={() => setEditing(undefined)}
					onSave={(r) => {
						upsert(r);
						setEditing(undefined);
						toast('Rule saved', { tone: 'success' });
					}}
				/>
			) : null}
		</Card>
	);
}

function RuleDialog({
	rule,
	onClose,
	onSave,
}: {
	rule: AutomationRule;
	onClose: () => void;
	onSave: (r: AutomationRule) => void;
}) {
	const [r, setR] = useState(rule);
	return (
		<Dialog
			open
			onClose={onClose}
			title={rule.name ? 'Edit rule' : 'New rule'}
			width="max-w-[520px]"
			footer={
				<div className="flex justify-end gap-2">
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button
						variant="primary"
						onClick={() => r.name.trim() && r.action.trim() && onSave(r)}
					>
						Save rule
					</Button>
				</div>
			}
		>
			<div className="space-y-4 px-5 py-5 sm:px-7">
				<Field label="Name" required>
					{(id) => (
						<Input
							id={id}
							value={r.name}
							onChange={(e) => setR({ ...r, name: e.target.value })}
						/>
					)}
				</Field>
				<Field label="Trigger">
					{(id) => (
						<Select
							id={id}
							value={r.trigger}
							onChange={(e) => setR({ ...r, trigger: e.target.value })}
						>
							{[
								'Ticket created',
								'Ticket created via WhatsApp',
								'Status changed',
								'SLA clock reaches 75%',
								'Comment added by client',
								'Daily at 02:00',
							].map((t) => (
								<option key={t}>{t}</option>
							))}
						</Select>
					)}
				</Field>
				<Field label="Condition" hint="optional">
					{(id) => (
						<Input
							id={id}
							value={r.condition}
							onChange={(e) => setR({ ...r, condition: e.target.value })}
							placeholder="e.g. priority is P1 and client plan is Gold"
						/>
					)}
				</Field>
				<Field label="Action" required>
					{(id) => (
						<Input
							id={id}
							value={r.action}
							onChange={(e) => setR({ ...r, action: e.target.value })}
							placeholder="e.g. Assign to on-call engineer · notify team lead"
						/>
					)}
				</Field>
			</div>
		</Dialog>
	);
}

function Csat() {
	const { draft: c, setDraft, dirty, save, discard } = useDraft('csat');
	return (
		<Card className="p-6">
			<CardHeader
				title="CSAT surveys"
				sub="Sent after a ticket is resolved. Low scores open a follow-up task for the account manager."
			/>
			{isLiveApi() && <NotConnectedNotice />}
			<div className="mt-2">
				<Row label="Send surveys">
					<Switch
						on={c.enabled}
						onChange={(v) => setDraft({ ...c, enabled: v })}
						label="CSAT enabled"
					/>
				</Row>
				<Row label="Channel">
					<Select
						value={c.channel}
						onChange={(e) => setDraft({ ...c, channel: e.target.value })}
						className="w-72"
						aria-label="Channel"
					>
						<option>WhatsApp, then email</option>
						<option>WhatsApp only</option>
						<option>Email only</option>
						<option>Portal only</option>
					</Select>
				</Row>
				<Row label="Delay after resolution">
					<div className="flex items-center gap-2">
						<Input
							type="number"
							min={0}
							value={c.delayHours}
							onChange={(e) =>
								setDraft({ ...c, delayHours: Number(e.target.value) })
							}
							className="w-24"
							aria-label="Delay hours"
						/>
						<span className="text-[13px] text-t2">hours</span>
					</div>
				</Row>
				<Row label="Question" sub="{key} is replaced with the ticket key">
					<Input
						value={c.question}
						onChange={(e) => setDraft({ ...c, question: e.target.value })}
						aria-label="Question"
					/>
				</Row>
				<Row label="Follow up when rating is below">
					<Select
						value={String(c.followUpBelow)}
						onChange={(e) =>
							setDraft({ ...c, followUpBelow: Number(e.target.value) })
						}
						className="w-32"
						aria-label="Follow-up threshold"
					>
						{[2, 3, 4].map((n) => (
							<option key={n} value={n}>
								{n}
							</option>
						))}
					</Select>
				</Row>
				<Row label="Preview">
					<div className="max-w-sm rounded-[10px] bg-success-bg px-3.5 py-2.5 text-[13px] text-t1">
						{c.question.replace('{key}', 'KS-2043')}
					</div>
				</Row>
			</div>
			<SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
		</Card>
	);
}

function Plans() {
	const plans = useDb((s) => s.settings.plans);
	const setSettings = useDb((s) => s.setSettings);
	return (
		<Card className="p-6">
			<CardHeader
				title="Contract plans"
				sub="Defaults applied when a client is created. Existing contracts keep their own terms."
			/>
			{isLiveApi() && <NotConnectedNotice />}
			<div className="mt-4 grid gap-4 md:grid-cols-3">
				{plans.map((p, i) => (
					<div
						key={p.tier}
						className={cn(
							'rounded-[12px] border p-4',
							p.tier === 'Gold'
								? 'border-brand-600 bg-brand-100/40'
								: 'border-border-strong',
						)}
					>
						<div className="flex items-center justify-between">
							<b className="text-[15px]">{p.name}</b>
							<Pill tone={p.tier === 'Gold' ? 'teal' : 'closed'}>{p.tier}</Pill>
						</div>
						<div className="mt-3 space-y-2 text-[13px]">
							<Field label="Monthly (₦)">
								{(id) => (
									<Input
										id={id}
										type="number"
										value={p.monthly}
										onChange={(e) =>
											setSettings(
												'plans',
												plans.map((x, j) =>
													j === i
														? { ...x, monthly: Number(e.target.value) }
														: x,
												),
											)
										}
										className="h-9"
									/>
								)}
							</Field>
							<Field label="Hours included">
								{(id) => (
									<Input
										id={id}
										type="number"
										value={p.hours}
										onChange={(e) =>
											setSettings(
												'plans',
												plans.map((x, j) =>
													j === i ? { ...x, hours: Number(e.target.value) } : x,
												),
											)
										}
										className="h-9"
									/>
								)}
							</Field>
							<Field label="Overage (₦/h)">
								{(id) => (
									<Input
										id={id}
										type="number"
										value={p.overage}
										onChange={(e) =>
											setSettings(
												'plans',
												plans.map((x, j) =>
													j === i
														? { ...x, overage: Number(e.target.value) }
														: x,
												),
											)
										}
										className="h-9"
									/>
								)}
							</Field>
							<p className="text-xs text-t2">{p.description}</p>
						</div>
					</div>
				))}
			</div>
			<div className="mt-4 flex justify-end">
				<Button
					variant="primary"
					onClick={() => toast('Contract plans saved', { tone: 'success' })}
				>
					Save changes
				</Button>
			</div>
		</Card>
	);
}

function Invoicing() {
	const { draft: inv, setDraft, dirty, save, discard } = useDraft('invoicing');
	const g = useDb((s) => s.settings.general);
	return (
		<Card className="p-6">
			<CardHeader
				title="Invoicing & tax"
				sub={`VAT ${g.vatPct}% is added to every invoice. ${g.rc} · ${g.tin} appear in the footer.`}
			/>
			{isLiveApi() && <NotConnectedNotice />}
			<div className="mt-2">
				<Row label="Invoice prefix">
					<Input
						value={inv.prefix}
						onChange={(e) => setDraft({ ...inv, prefix: e.target.value })}
						className="w-32 font-mono"
						aria-label="Invoice prefix"
					/>
				</Row>
				<Row label="Payment terms">
					<div className="flex items-center gap-2">
						<Input
							type="number"
							value={inv.dueDays}
							onChange={(e) =>
								setDraft({ ...inv, dueDays: Number(e.target.value) })
							}
							className="w-24"
							aria-label="Due days"
						/>
						<span className="text-[13px] text-t2">days from issue</span>
					</div>
				</Row>
				<Row label="Bank details" sub="Shown on invoices for transfers">
					<div className="grid gap-2 sm:grid-cols-3">
						<Input
							value={inv.bankName}
							onChange={(e) => setDraft({ ...inv, bankName: e.target.value })}
							aria-label="Bank"
						/>
						<Input
							value={inv.bankAccount}
							onChange={(e) =>
								setDraft({ ...inv, bankAccount: e.target.value })
							}
							className="font-mono"
							aria-label="Account number"
						/>
						<Input
							value={inv.accountName}
							onChange={(e) =>
								setDraft({ ...inv, accountName: e.target.value })
							}
							aria-label="Account name"
						/>
					</div>
				</Row>
				<Row label="Reminders" sub="Days relative to due date">
					<div className="flex flex-wrap gap-1.5">
						{[14, 7, 3, 1, -1, -3, -7].map((d) => {
							const on = inv.reminderDays.includes(d);
							return (
								<button
									key={d}
									type="button"
									onClick={() =>
										setDraft({
											...inv,
											reminderDays: on
												? inv.reminderDays.filter((x) => x !== d)
												: [...inv.reminderDays, d].sort((a, b) => b - a),
										})
									}
									className={cn(
										'rounded-sm px-3 py-1.5 text-[13px]',
										on
											? 'bg-brand-100 font-medium text-brand-900'
											: 'border border-border-strong text-t2',
									)}
									aria-pressed={on}
								>
									{d > 0 ? `${d}d before` : `${-d}d after`}
								</button>
							);
						})}
					</div>
				</Row>
				<Row label="Show TIN on invoices">
					<Switch
						on={inv.vatNumberShown}
						onChange={(v) => setDraft({ ...inv, vatNumberShown: v })}
						label="Show TIN"
					/>
				</Row>
			</div>
			<SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
		</Card>
	);
}

function Portal() {
	const { draft: p, setDraft, dirty, save, discard } = useDraft('portal');
	const channels = useDb((s) => s.settings.channels);
	return (
		<Card className="p-6">
			<CardHeader
				title="Client portal"
				sub={`Live at ${channels.portal.url}. Clients sign in with the contacts on their account.`}
			/>
			{isLiveApi() && <NotConnectedNotice />}
			<div className="mt-2">
				{(
					[
						[
							'enabled',
							'Portal enabled',
							'Turn off to hide the portal without deleting client logins',
						],
						[
							'kbPublic',
							'Public knowledge base',
							'Show articles marked Public',
						],
						[
							'allowAttachments',
							'Attachments on requests',
							'Photos and logs up to 25 MB',
						],
						[
							'showSla',
							'Show SLA timers',
							'Response and resolution targets on each ticket',
						],
						[
							'csatOnPortal',
							'CSAT on the portal',
							'Rate resolved tickets in the portal as well as WhatsApp',
						],
					] as const
				).map(([k, l, s]) => (
					<Row key={k} label={l} sub={s}>
						<Switch
							on={p[k]}
							onChange={(v) => setDraft({ ...p, [k]: v })}
							label={l}
						/>
					</Row>
				))}
				<Row label="Custom domain" sub="Enterprise">
					<Input
						value={p.customDomain}
						onChange={(e) => setDraft({ ...p, customDomain: e.target.value })}
						placeholder="support.yourcompany.ng"
						aria-label="Custom domain"
					/>
				</Row>
			</div>
			<SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
		</Card>
	);
}

function Integrations() {
	const list = useDb((s) => s.settings.integrations);
	const setSettings = useDb((s) => s.setSettings);
	return (
		<div className="space-y-4">
			{isLiveApi() && <NotConnectedNotice />}
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			{list.map((i) => (
				<Card key={i.id} className="flex flex-col p-5">
					<div className="flex items-start justify-between gap-2">
						<b className="text-[15px]">{i.name}</b>
						{i.connected ? (
							<Pill tone="done">Connected</Pill>
						) : (
							<Pill tone="closed">Not connected</Pill>
						)}
					</div>
					<p className="mt-1.5 flex-1 text-[13px] text-t2">{i.description}</p>
					{i.detail ? <p className="mt-2 text-xs text-t2">{i.detail}</p> : null}
					<div className="mt-3 flex gap-2">
						{i.connected ? (
							<>
								<Button
									size="sm"
									onClick={() =>
										toast(`${i.name} settings`, { description: i.detail })
									}
								>
									Configure
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => {
										setSettings(
											'integrations',
											list.map((x) =>
												x.id === i.id
													? { ...x, connected: false, detail: undefined }
													: x,
											),
										);
										toast(`${i.name} disconnected`);
									}}
								>
									Disconnect
								</Button>
							</>
						) : (
							<Button
								size="sm"
								variant="primary"
								onClick={() => {
									setSettings(
										'integrations',
										list.map((x) =>
											x.id === i.id
												? {
														...x,
														connected: true,
														detail: 'Connected just now',
													}
												: x,
										),
									);
									toast(`${i.name} connected`, { tone: 'success' });
								}}
							>
								Connect
							</Button>
						)}
					</div>
				</Card>
			))}
		</div>
		</div>
	);
}

function Api() {
	const keys = useDb((s) => s.settings.apiKeys);
	const hooks = useDb((s) => s.settings.webhooks);
	const addApiKey = useDb((s) => s.addApiKey);
	const revoke = useDb((s) => s.revokeApiKey);
	const upsertWebhook = useDb((s) => s.upsertWebhook);
	const now = useNow(60_000);
	const [secret, setSecret] = useState<string>();
	const [hookUrl, setHookUrl] = useState('');
	return (
		<div className="space-y-4">
			{isLiveApi() ? <LiveApiKeys /> : <Card className="p-6">
				<CardHeader
					title="API keys"
					sub="Server-to-server access. Keys are shown once."
					action={
						<Button
							size="sm"
							onClick={() => {
								const name = window.prompt('Key name', 'Monitoring bridge');
								if (!name) return;
								const k = addApiKey(name, ['tickets:write', 'assets:read']);
								setSecret(k.secret);
							}}
						>
							<KeyRound size={13} /> Create key
						</Button>
					}
				/>
				{secret ? (
					<div className="mt-3 flex flex-wrap items-center gap-2 rounded-[10px] border border-warning bg-warning-bg/60 px-3.5 py-3 text-[13px]">
						<span>Copy this key now — it won't be shown again:</span>
						<code className="rounded bg-white px-2 py-1 font-mono text-xs">
							{secret}
						</code>
						<Button
							size="sm"
							onClick={() => {
								navigator.clipboard?.writeText(secret).catch(() => {});
								toast('Key copied');
							}}
						>
							<Copy size={13} /> Copy
						</Button>
						<button
							type="button"
							className="ms-auto text-xs text-t2 hover:underline"
							onClick={() => setSecret(undefined)}
						>
							Dismiss
						</button>
					</div>
				) : null}
				<ul className="mt-3 divide-y divide-border text-[13px]">
					{keys.length === 0 ? (
						<li className="py-3 text-t3">No API keys.</li>
					) : (
						keys.map((k) => (
							<li key={k.id} className="flex flex-wrap items-center gap-3 py-3">
								<b className="w-48">{k.name}</b>
								<code className="font-mono text-xs text-t2">{k.prefix}…</code>
								<span className="flex gap-1">
									{k.scopes.map((s) => (
										<LabelChip key={s}>{s}</LabelChip>
									))}
								</span>
								<span className="ms-auto text-xs text-t2">
									created {relativeTime(k.createdAt, now)}
									{k.lastUsedAt
										? ` · used ${relativeTime(k.lastUsedAt, now)}`
										: ' · never used'}
								</span>
								<Button
									size="sm"
									variant="ghost"
									className="text-danger-fg"
									onClick={() => {
										if (window.confirm(`Revoke ${k.name}?`)) {
											revoke(k.id);
											toast('Key revoked');
										}
									}}
								>
									<Trash2 size={13} /> Revoke
								</Button>
							</li>
						))
					)}
				</ul>
			</Card>}
			<Card className="p-6">
				<CardHeader
					title="Webhooks"
					sub={isLiveApi() ? 'Preview only · webhook delivery is not connected to the server yet.' : 'POST JSON on events. Retries 5× with backoff; signed with the workspace secret.'}
				/>
				<div className="mt-3 flex gap-2">
					<Input
						value={hookUrl}
						onChange={(e) => setHookUrl(e.target.value)}
						placeholder="https://example.com/ledgedesk"
						className="h-9"
						aria-label="Webhook URL"
					/>
					<Button
						onClick={() => {
							if (!/^https?:\/\//.test(hookUrl))
								return toast('Enter a valid URL', { tone: 'danger' });
							upsertWebhook({
								id: `w_${Date.now()}`,
								url: hookUrl,
								events: ['ticket.created', 'ticket.resolved'],
								enabled: true,
								lastStatus: 'pending first delivery',
							});
							setHookUrl('');
							toast('Webhook added', { tone: 'success' });
						}}
					>
						<WebhookIcon size={15} aria-hidden /> Add
					</Button>
				</div>
				<ul className="mt-3 divide-y divide-border text-[13px]">
					{hooks.map((h) => (
						<li key={h.id} className="flex flex-wrap items-center gap-3 py-3">
							<Switch
								size="sm"
								on={h.enabled}
								onChange={(v) => upsertWebhook({ ...h, enabled: v })}
								label="Webhook enabled"
							/>
							<code className="min-w-0 flex-1 truncate font-mono text-xs">
								{h.url}
							</code>
							<span className="flex gap-1">
								{h.events.map((e) => (
									<LabelChip key={e}>{e}</LabelChip>
								))}
							</span>
							<span className="text-xs text-t2">{h.lastStatus}</span>
							<Button
								size="sm"
								variant="ghost"
								onClick={() => {
									upsertWebhook({
										...h,
										lastStatus: `test 200 OK · ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
									});
									toast('Test event delivered', { tone: 'success' });
								}}
							>
								Send test
							</Button>
						</li>
					))}
				</ul>
			</Card>
		</div>
	);
}

function ExportNdpr() {
	const [requests, setRequests] = useState<
		{ id: string; subject: string; type: string; at: number; status: string }[]
	>(() => [
		{
			id: 'r1',
			subject: 'Tunde Bakare (Lekki Fintech)',
			type: 'Subject access',
			at: Date.now() - 6 * 86_400_000,
			status: 'Delivered',
		},
	]);
	const [subject, setSubject] = useState('');
	const now = useNow(60_000);
	return (
		<div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
			<Card className="p-6">
				<CardHeader
					title="Workspace export"
					sub="Everything as CSV + attachments in a ZIP. Emailed when ready (usually under 10 minutes)."
				/>
				<div className="mt-4 flex flex-wrap gap-2">
					{[
						'Tickets & comments',
						'Clients & contracts',
						'Assets',
						'Audit log',
					].map((x) => (
						<label key={x} className="flex items-center gap-2 text-[13px]">
							<input
								type="checkbox"
								defaultChecked
								className="accent-brand-900"
							/>{' '}
							{x}
						</label>
					))}
				</div>
				<Button
					variant="primary"
					className="mt-4"
					onClick={() =>
						toast('Export started', {
							tone: 'success',
							description: 'You will get an email with a download link.',
						})
					}
				>
					<Download size={15} aria-hidden /> Request export
				</Button>
				<p className="mt-3 text-xs text-t2">
					Retention: tickets 5 years · audit log 12 months · WhatsApp media 90
					days.
				</p>
			</Card>
			<Card className="p-6">
				<CardHeader
					title="NDPR subject requests"
					sub="Respond within 30 days. Verify identity via the registered client contact first."
				/>
				<div className="mt-3 flex gap-2">
					<Input
						value={subject}
						onChange={(e) => setSubject(e.target.value)}
						placeholder="Person and client, e.g. Halima Bello (Abuja Health)"
						className="h-9"
						aria-label="Subject"
					/>
					<Button
						onClick={() => {
							if (!subject.trim()) return;
							setRequests((r) => [
								{
									id: `r_${Date.now()}`,
									subject: subject.trim(),
									type: 'Subject access',
									at: Date.now(),
									status: 'Verifying identity',
								},
								...r,
							]);
							setSubject('');
							toast('Request logged', {
								tone: 'success',
								description: 'Due in 30 days · assigned to the DPO.',
							});
						}}
					>
						Log request
					</Button>
				</div>
				<ul className="mt-3 divide-y divide-border text-[13px]">
					{requests.map((r) => (
						<li key={r.id} className="flex items-center gap-3 py-2.5">
							<span className="min-w-0 flex-1">
								<b className="block">{r.subject}</b>
								<span className="text-xs text-t2">
									{r.type} · {relativeTime(r.at, now)} · due{' '}
									{new Date(r.at + 30 * 86_400_000).toLocaleDateString(
										'en-GB',
										{ day: 'numeric', month: 'short' },
									)}
								</span>
							</span>
							<Pill tone={r.status === 'Delivered' ? 'done' : 'open'}>
								{r.status}
							</Pill>
						</li>
					))}
				</ul>
			</Card>
		</div>
	);
}

// ---------- notification preferences ----------

function NotifPrefs() {
	if (isLiveApi()) return <LiveNotificationPrefs />;
	return (
		<Card className="p-6">
			<CardHeader
				title="Notification preferences"
				sub="Control which events send you an in-app alert and which also email you."
			/>
			<p className="mt-4 text-[13px] text-t2">Connect to the live API to manage notification preferences.</p>
		</Card>
	);
}

// ---------- page ----------

export function SettingsPage() {
	const org = useAuthStore((s) => s.org)!;
	const { section } = useParams({ from: '/authed/$org/settings/$section' });
	const navigate = useNavigate();
	const title = sectionTitle(section);
	const group =
		settingsSections.find((g) => g.items.some(([k]) => k === section))?.group ??
		'Workspace';

	const body = (() => {
		switch (section as SettingsSection) {
			case 'general':
				return <SettingsGate><General /></SettingsGate>;
			case 'branding':
				return <SettingsGate><Branding /></SettingsGate>;
			case 'team':
				return <TeamRoles orgSlug={org.slug} />;
			case 'billing':
				return <Billing />;
			case 'security':
				return <Security />;
			case 'audit':
				return <Audit />;
			case 'channels':
				return <Channels />;
			case 'sla':
				return <Sla orgSlug={org.slug} />;
			case 'ticket-types':
				return <TicketTypes />;
			case 'business-hours':
				return <SettingsGate><General /></SettingsGate>;
			case 'automation':
				return <Automation />;
			case 'csat':
				return <Csat />;
			case 'notifications':
				return <NotifPrefs />;
			case 'plans':
				return <Plans />;
			case 'invoicing':
				return <Invoicing />;
			case 'portal':
				return <Portal />;
			case 'integrations':
				return <Integrations />;
			case 'api':
				return <Api />;
			case 'export':
				return <ExportNdpr />;
			default:
				return (
					<Card className="p-6">
						<CardHeader title="Unknown section" />
					</Card>
				);
		}
	})();

	return (
		<AppShell
			meta={{ title: 'Settings', subtitle: `${group} · ${title}` }}
			mobileHeader={
				<MobileHeader>
					<Link
						to="/$org/settings/$section"
						params={{ org: org.slug, section: 'general' }}
						className="flex items-center gap-1 text-[13px] text-on-dark-muted"
					>
						<ChevronLeft size={16} /> Settings
					</Link>
					<h1 className="mt-1 text-xl font-semibold">{title}</h1>
					<Select
						value={section}
						onChange={(e) =>
							navigate({
								to: '/$org/settings/$section',
								params: { org: org.slug, section: e.target.value },
							})
						}
						className="mt-3 h-10 border-transparent bg-white/10 text-white [&>select]:text-white"
						aria-label="Settings section"
						data-tour="m-settings"
					>
						{settingsSections
							.flatMap((g) => g.items)
							.map(([k, l]) => (
								<option key={k} value={k} className="text-t1">
									{l}
								</option>
							))}
					</Select>
				</MobileHeader>
			}
		>
			<div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)] [&>*]:min-w-0">
				<Card className="hidden h-max p-3 lg:block" data-tour="settings-nav">
					{settingsSections.map((g) => (
						<div key={g.group} className="mb-2">
							<div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-t2 uppercase">
								{g.group}
							</div>
							{g.items.map(([k, l]) => (
								<Link
									key={k}
									to="/$org/settings/$section"
									params={{ org: org.slug, section: k }}
									className="block rounded-sm px-3 py-2 text-[13px] text-t2 hover:bg-muted hover:text-t1 data-[status=active]:bg-brand-100 data-[status=active]:font-semibold data-[status=active]:text-brand-900"
								>
									{l}
								</Link>
							))}
						</div>
					))}
				</Card>
				<div data-tour={section === 'sla' ? 'settings-sla' : undefined}>
					{isLiveApi() && !LIVE_SECTIONS.has(section) ? <NotConnectedNotice /> : null}
					{body}
				</div>
			</div>
		</AppShell>
	);
}
