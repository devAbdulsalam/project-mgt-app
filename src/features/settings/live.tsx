// The parts of Settings that read and write the backend.
//
// Everything here is inert in mock mode: `SettingsPage` only reaches for these
// when `isLiveApi()` is true, and the mock sections keep using the in-browser
// store. The split follows what the backend can honour today — workspace
// identity and branding, business hours, SLA targets, API keys. The rest of the
// page (channels, automation, billing, webhooks…) has no server model yet.

import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { KeyRound, Copy, Trash2 } from 'lucide-react';
import { api } from '@/api';
import { Button, Card, CardHeader, Dialog, Field, Input, LabelChip } from '@/shared/ui';
import { useAuthStore } from '@/shared/lib/auth-store';
import { isLiveApi } from '@/shared/lib/live-api';
import { toast } from '@/shared/lib/toast-store';
import { relativeTime, useNow } from '@/shared/lib/time';
import { useMyAccess } from '@/features/team/hooks/useTeam';
import { errorMessage, useServerSettings } from './hooks/useLiveSettings';

/** Holds a live settings section back until the server has answered, so demo values never flash. */
export function SettingsGate({ children }: { children: ReactNode }) {
	const orgSlug = useAuthStore((s) => s.org?.slug ?? '');
	const query = useServerSettings(orgSlug);
	if (!isLiveApi() || query.isSuccess) return <>{children}</>;
	return <Card className="p-6 text-[13px] text-t2">{query.isError ? 'Could not load settings.' : 'Loading settings…'}</Card>;
}

/** Shown above the sections that have no server model yet. */
export function NotConnectedNotice() {
	return (
		<div className="mb-4 rounded-[10px] border border-border bg-muted px-4 py-3 text-[13px] text-t2" role="note">
			<b className="text-t1">Preview only.</b> This section is not connected to the server yet; changes stay in this browser.
		</div>
	);
}

// -- SLA targets ---------------------------------------------------------------

interface SlaTargetDto {
	priority: 'p1' | 'p2' | 'p3' | 'p4';
	respond_min: number;
	resolve_min: number;
	customised: boolean;
}

const PRIORITY_LABEL: Record<SlaTargetDto['priority'], string> = { p1: 'P1 · Critical', p2: 'P2 · High', p3: 'P3 · Medium', p4: 'P4 · Low' };

const slaKey = (org: string) => ['org', org, '/sla-targets'] as const;

export function LiveSla() {
	const orgSlug = useAuthStore((s) => s.org!.slug);
	const queryClient = useQueryClient();
	const access = useMyAccess(orgSlug);
	const canEdit = access.can('settings.manage');
	const query = useQuery({
		queryKey: slaKey(orgSlug),
		queryFn: async ({ signal }) => (await api.get<{ data: SlaTargetDto[] }>(`/orgs/${orgSlug}/sla-targets`, { signal })).data,
		enabled: isLiveApi(),
		staleTime: 30_000,
	});
	// Edits are held as text so a half-typed number is not rewritten under the cursor.
	const [edits, setEdits] = useState<Record<string, { respond?: string; resolve?: string }>>({});
	const [busy, setBusy] = useState(false);

	if (query.isPending) return <Card className="p-6 text-[13px] text-t2">Loading SLA targets…</Card>;
	if (query.isError) return <Card className="p-6 text-[13px] text-t2">Could not load SLA targets.</Card>;
	const targets = query.data;

	const respondOf = (t: SlaTargetDto) => edits[t.priority]?.respond ?? String(t.respond_min);
	const resolveOf = (t: SlaTargetDto) => edits[t.priority]?.resolve ?? String(+(t.resolve_min / 60).toFixed(2));
	const parsed = targets.map((t) => ({ t, respond: Math.round(Number(respondOf(t))), resolve: Math.round(Number(resolveOf(t)) * 60) }));
	const invalid = parsed.some((p) => !Number.isFinite(p.respond) || !Number.isFinite(p.resolve) || p.respond < 1 || p.resolve < p.respond);
	const dirty = parsed.some((p) => p.respond !== p.t.respond_min || p.resolve !== p.t.resolve_min);
	const anyCustom = targets.some((t) => t.customised);

	const save = async () => {
		setBusy(true);
		try {
			const changed = parsed.filter((p) => p.respond !== p.t.respond_min || p.resolve !== p.t.resolve_min);
			const res = await api.put<{ data: SlaTargetDto[] }>(`/orgs/${orgSlug}/sla-targets`, { json: { targets: changed.map((p) => ({ priority: p.t.priority, respond_min: p.respond, resolve_min: p.resolve })) } });
			queryClient.setQueryData(slaKey(orgSlug), res.data);
			setEdits({});
			toast('SLA targets saved', { tone: 'success', description: 'Applies to tickets created from now on.' });
		} catch (err) {
			toast(errorMessage(err, 'Could not save SLA targets.'), { tone: 'danger' });
		} finally {
			setBusy(false);
		}
	};

	const reset = async () => {
		if (!window.confirm('Reset every priority to the default targets?')) return;
		setBusy(true);
		try {
			const res = await api.del<{ data: SlaTargetDto[] }>(`/orgs/${orgSlug}/sla-targets`);
			queryClient.setQueryData(slaKey(orgSlug), res.data);
			setEdits({});
			toast('SLA targets reset', { tone: 'success' });
		} catch (err) {
			toast(errorMessage(err, 'Could not reset SLA targets.'), { tone: 'danger' });
		} finally {
			setBusy(false);
		}
	};

	return (
		<div>
			<h2 className="text-lg font-semibold">SLA targets</h2>
			<p className="text-[13px] text-t2">
				How quickly each priority must get a first response and be resolved. A new ticket's deadlines are set from these when it is created; open tickets keep the ones they have. The clock pauses while a ticket is waiting on the client, awaiting a vendor or scheduled.
			</p>
			<Card className="mt-4 overflow-x-auto">
				<table className="w-full min-w-[520px] text-[13px]">
					<thead>
						<tr className="bg-muted text-left text-[11px] font-semibold tracking-wider text-t2 uppercase">
							<th className="px-5 py-3">Priority</th>
							<th className="px-3 py-3">First response (minutes)</th>
							<th className="px-3 py-3">Resolution (hours)</th>
							<th className="px-3 py-3" />
						</tr>
					</thead>
					<tbody>
						{targets.map((t) => (
							<tr key={t.priority} className="border-t border-border">
								<td className="px-5 py-3 font-semibold">{PRIORITY_LABEL[t.priority]}</td>
								<td className="px-3 py-3"><Input type="number" min={1} value={respondOf(t)} disabled={!canEdit} onChange={(e) => setEdits({ ...edits, [t.priority]: { ...edits[t.priority], respond: e.target.value } })} className="h-9 w-28" aria-label={`${PRIORITY_LABEL[t.priority]} first response in minutes`} /></td>
								<td className="px-3 py-3"><Input type="number" min={0.1} step="any" value={resolveOf(t)} disabled={!canEdit} onChange={(e) => setEdits({ ...edits, [t.priority]: { ...edits[t.priority], resolve: e.target.value } })} className="h-9 w-28" aria-label={`${PRIORITY_LABEL[t.priority]} resolution in hours`} /></td>
								<td className="px-3 py-3 text-xs text-t2">{t.customised ? 'Customised' : 'Default'}</td>
							</tr>
						))}
					</tbody>
				</table>
			</Card>
			{invalid ? <p role="alert" className="mt-2 text-xs text-danger">Response must be at least 1 minute, and resolution cannot be shorter than response.</p> : null}
			{canEdit ? (
				<div className="mt-4 flex justify-end gap-3">
					<Button variant="ghost" onClick={() => { void reset(); }} disabled={busy || !anyCustom}>Reset to defaults</Button>
					<Button variant="ghost" onClick={() => setEdits({})} disabled={!dirty || busy}>Discard</Button>
					<Button variant="primary" onClick={() => { void save(); }} disabled={!dirty || invalid || busy}>Save changes</Button>
				</div>
			) : <p className="mt-3 text-xs text-t2">Only admins can change SLA targets.</p>}
		</div>
	);
}

// -- API keys ------------------------------------------------------------------

interface ApiKeyDto {
	id: string;
	name: string;
	prefix: string;
	scopes: string[];
	created_by_name: string;
	last_used_at: string | null;
	created_at: string;
}

const SCOPES: readonly { id: string; label: string; sub: string }[] = [
	{ id: 'tickets:read', label: 'tickets:read', sub: 'Read tickets and comments' },
	{ id: 'tickets:write', label: 'tickets:write', sub: 'Create, edit, assign, transition, comment' },
	{ id: 'projects:read', label: 'projects:read', sub: 'Read projects' },
	{ id: 'clients:read', label: 'clients:read', sub: 'Read clients, sites, assets, visits' },
	{ id: 'assets:read', label: 'assets:read', sub: 'Read assets' },
];

const keysKey = (org: string) => ['org', org, '/api-keys'] as const;

export function LiveApiKeys() {
	const orgSlug = useAuthStore((s) => s.org!.slug);
	const queryClient = useQueryClient();
	const access = useMyAccess(orgSlug);
	const allowed = access.can('settings.manage');
	const now = useNow(60_000);
	const query = useQuery({
		queryKey: keysKey(orgSlug),
		queryFn: async ({ signal }) => (await api.get<{ data: ApiKeyDto[] }>(`/orgs/${orgSlug}/api-keys`, { signal })).data,
		enabled: isLiveApi() && allowed,
		staleTime: 15_000,
	});
	const [creating, setCreating] = useState(false);
	const [name, setName] = useState('');
	const [scopes, setScopes] = useState<string[]>(['tickets:read']);
	const [error, setError] = useState<string>();
	const [secret, setSecret] = useState<string>();

	const create = async () => {
		if (!name.trim()) return setError('Give the key a name');
		if (scopes.length === 0) return setError('Choose at least one scope');
		try {
			const key = await api.post<{ secret: string }>(`/orgs/${orgSlug}/api-keys`, { json: { name: name.trim(), scopes } });
			setSecret(key.secret);
			setCreating(false);
			setName('');
			setScopes(['tickets:read']);
			setError(undefined);
			await queryClient.invalidateQueries({ queryKey: keysKey(orgSlug) });
		} catch (err) {
			setError(errorMessage(err, 'Could not create the key.'));
		}
	};

	const revoke = async (key: ApiKeyDto) => {
		if (!window.confirm(`Revoke ${key.name}? Anything using it stops working immediately.`)) return;
		try {
			await api.del(`/orgs/${orgSlug}/api-keys/${key.id}`);
			toast('Key revoked');
			await queryClient.invalidateQueries({ queryKey: keysKey(orgSlug) });
		} catch (err) {
			toast(errorMessage(err, 'Could not revoke the key.'), { tone: 'danger' });
		}
	};

	const keys = query.data ?? [];
	return (
		<Card className="p-6">
			<CardHeader
				title="API keys"
				sub="Server-to-server access. A key acts as you, limited to the scopes you choose; it can never manage people, settings or other keys. Shown once."
				action={allowed ? <Button size="sm" onClick={() => setCreating(true)}><KeyRound size={13} /> Create key</Button> : undefined}
			/>
			{secret ? (
				<div className="mt-3 flex flex-wrap items-center gap-2 rounded-[10px] border border-warning bg-warning-bg/60 px-3.5 py-3 text-[13px]">
					<span>Copy this key now — it won't be shown again:</span>
					<code className="rounded bg-white px-2 py-1 font-mono text-xs break-all">{secret}</code>
					<Button size="sm" onClick={() => { navigator.clipboard?.writeText(secret).catch(() => {}); toast('Key copied'); }}><Copy size={13} /> Copy</Button>
					<button type="button" className="ms-auto text-xs text-t2 hover:underline" onClick={() => setSecret(undefined)}>Dismiss</button>
				</div>
			) : null}
			{!allowed ? <p className="mt-3 text-[13px] text-t2">Only admins can manage API keys.</p> : (
				<ul className="mt-3 divide-y divide-border text-[13px]">
					{query.isPending ? <li className="py-3 text-t3">Loading…</li> : keys.length === 0 ? <li className="py-3 text-t3">No API keys.</li> : keys.map((k) => (
						<li key={k.id} className="flex flex-wrap items-center gap-3 py-3">
							<b className="w-48">{k.name}</b>
							<code className="font-mono text-xs text-t2">{k.prefix}…</code>
							<span className="flex flex-wrap gap-1">{k.scopes.map((s) => <LabelChip key={s}>{s}</LabelChip>)}</span>
							<span className="ms-auto text-xs text-t2">by {k.created_by_name} · created {relativeTime(Date.parse(k.created_at), now)}{k.last_used_at ? ` · used ${relativeTime(Date.parse(k.last_used_at), now)}` : ' · never used'}</span>
							<Button size="sm" variant="ghost" className="text-danger-fg" onClick={() => { void revoke(k); }}><Trash2 size={13} /> Revoke</Button>
						</li>
					))}
				</ul>
			)}
			<Dialog open={creating} onClose={() => setCreating(false)} title="Create API key" width="max-w-[520px]" footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button><Button variant="primary" onClick={() => { void create(); }}>Create key</Button></div>}>
				<div className="space-y-4 px-5 py-5">
					<Field label="Name" error={error && !name.trim() ? error : undefined}>{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="Monitoring bridge" />}</Field>
					<fieldset>
						<legend className="mb-1.5 text-xs font-semibold text-t2">Scopes</legend>
						<div className="space-y-2">
							{SCOPES.map((s) => (
								<label key={s.id} className="flex items-start gap-2.5 text-[13px]">
									<input type="checkbox" className="mt-0.5 size-4 accent-brand-900" checked={scopes.includes(s.id)} onChange={(e) => setScopes(e.target.checked ? [...scopes, s.id] : scopes.filter((x) => x !== s.id))} />
									<span><code className="font-mono text-xs">{s.label}</code><span className="block text-xs text-t2">{s.sub}</span></span>
								</label>
							))}
						</div>
						{error && name.trim() ? <p role="alert" className="mt-2 text-xs text-danger">{error}</p> : null}
					</fieldset>
				</div>
			</Dialog>
		</Card>
	);
}

// -- Notification preferences --------------------------------------------------

interface NotifPrefsDto {
	in_app: Record<string, boolean>;
	email: Record<string, boolean>;
	digest: 'off' | 'daily' | 'weekly';
}

/** Every toggle the UI shows, with a human label. */
const NOTIF_EVENTS: { id: string; label: string; sub: string }[] = [
	{ id: 'ticket.assigned',   label: 'Ticket assigned to me',          sub: 'When a ticket is assigned to you directly' },
	{ id: 'ticket.mentioned',  label: 'Mentioned in a comment',          sub: 'When someone @-mentions you on a ticket' },
	{ id: 'ticket.reply',      label: 'Client replied',                  sub: 'New reply on a ticket you are following' },
	{ id: 'ticket.resolved',   label: 'Ticket resolved',                 sub: 'Tickets you own or are following are closed' },
	{ id: 'sla.warning',       label: 'SLA warning (75%)',               sub: 'Clock reaches 75 % on a ticket you own' },
	{ id: 'sla.breach',        label: 'SLA breach',                      sub: 'Deadline missed on a ticket you own' },
	{ id: 'visit.assigned',    label: 'Visit assigned to me',            sub: 'A field visit is scheduled for you' },
	{ id: 'member.invited',    label: 'New team member invited',         sub: 'Admin-only · someone was invited to the workspace' },
];

const prefsKey = (org: string) => ['org', org, '/notifications/prefs'] as const;

/**
 * Live notification preferences panel.
 *
 * Reads and writes GET/PUT /orgs/:org/notifications/prefs.
 * Each row has an in-app toggle and an email toggle.
 * The digest selector controls how often unread notifications are batched.
 */
export function LiveNotificationPrefs() {
	const orgSlug = useAuthStore((s) => s.org!.slug);
	const queryClient = useQueryClient();

	const query = useQuery({
		queryKey: prefsKey(orgSlug),
		queryFn: ({ signal }) =>
			api.get<NotifPrefsDto>(`/orgs/${orgSlug}/notifications/prefs`, { signal }),
		enabled: isLiveApi(),
		staleTime: 60_000,
	});

	const mutation = useMutation({
		mutationFn: (prefs: NotifPrefsDto) =>
			api.put<NotifPrefsDto>(`/orgs/${orgSlug}/notifications/prefs`, { json: prefs }),
		onSuccess: (saved) => {
			queryClient.setQueryData(prefsKey(orgSlug), saved);
			toast('Notification preferences saved', { tone: 'success' });
		},
		onError: (err) => {
			toast(errorMessage(err, 'Could not save notification preferences.'), { tone: 'danger' });
		},
	});

	if (query.isPending) {
		return <Card className="p-6 text-[13px] text-t2">Loading preferences…</Card>;
	}
	if (query.isError) {
		return <Card className="p-6 text-[13px] text-t2">Could not load notification preferences.</Card>;
	}

	const prefs = query.data;

	const setInApp = (id: string, value: boolean) => {
		mutation.mutate({ ...prefs, in_app: { ...prefs.in_app, [id]: value } });
	};

	const setEmail = (id: string, value: boolean) => {
		mutation.mutate({ ...prefs, email: { ...prefs.email, [id]: value } });
	};

	const setDigest = (digest: NotifPrefsDto['digest']) => {
		mutation.mutate({ ...prefs, digest });
	};

	// Default: on unless explicitly set to false.
	const inApp = (id: string) => prefs.in_app[id] !== false;
	const email = (id: string) => prefs.email[id] !== false;

	return (
		<div className="space-y-4">
			<Card className="overflow-x-auto">
				<table className="w-full min-w-[540px] text-[13px]">
					<thead>
						<tr className="bg-muted text-left text-[11px] font-semibold tracking-wider text-t2 uppercase">
							<th className="px-5 py-3">Event</th>
							<th className="px-4 py-3 text-center">In-app</th>
							<th className="px-4 py-3 text-center">Email</th>
						</tr>
					</thead>
					<tbody>
						{NOTIF_EVENTS.map((ev) => (
							<tr key={ev.id} className="border-t border-border">
								<td className="px-5 py-3">
									<b className="block">{ev.label}</b>
									<span className="text-xs text-t2">{ev.sub}</span>
								</td>
								<td className="px-4 py-3 text-center">
									<Switch
										size="sm"
										on={inApp(ev.id)}
										onChange={(v) => setInApp(ev.id, v)}
										label={`In-app: ${ev.label}`}
										disabled={mutation.isPending}
									/>
								</td>
								<td className="px-4 py-3 text-center">
									<Switch
										size="sm"
										on={email(ev.id)}
										onChange={(v) => setEmail(ev.id, v)}
										label={`Email: ${ev.label}`}
										disabled={mutation.isPending}
									/>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</Card>

			<Card className="p-6">
				<CardHeader
					title="Email digest"
					sub="Instead of one email per event, receive a summary. Sent at the hour configured in your profile timezone."
				/>
				<div className="mt-3 flex flex-wrap gap-3">
					{(['off', 'daily', 'weekly'] as const).map((opt) => (
						<button
							key={opt}
							type="button"
							onClick={() => setDigest(opt)}
							disabled={mutation.isPending}
							className={`rounded-[8px] border px-4 py-2 text-[13px] font-medium capitalize transition-colors ${
								prefs.digest === opt
									? 'border-brand-900 bg-brand-900 text-white'
									: 'border-border text-t2 hover:bg-muted'
							}`}
							aria-pressed={prefs.digest === opt}
						>
							{opt === 'off' ? 'Real-time (no digest)' : `${opt.charAt(0).toUpperCase()}${opt.slice(1)} digest`}
						</button>
					))}
				</div>
				<p className="mt-2 text-xs text-t2">
					{prefs.digest === 'off'
						? 'Every notification triggers its own email immediately.'
						: `Notifications are batched into a ${prefs.digest} email. SLA breach alerts always arrive immediately.`}
				</p>
			</Card>
		</div>
	);
}
