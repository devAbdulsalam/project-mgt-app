import { useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Bell, Camera, CheckCircle2, ChevronRight, Eye, Keyboard, Loader2, Lock, Map, MapPin, Shield, Trash2, User as UserIcon, CalendarDays } from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import { LogoutDialog } from '@/shared/layouts/LogoutDialog';
import { Avatar, Button, Card, CardHeader, Field, Input, Kbd, Pill, Select, Switch, Textarea } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { toast } from '@/shared/lib/toast-store';
import { api, ApiError } from '@/api';
import { isLiveApi } from '@/shared/lib/live-api';
import { relativeTime, useNow } from '@/shared/lib/time';
import { describeDevice, useAvatarActions, useDevices, useLiveProfile, useSaveProfile } from './hooks/useProfile';
import { useDb } from '@/mocks/db';
import type { User } from '@/mocks/data';
import { passwordStrength } from '@/features/auth/lib/password';
import { PasswordInput, PasswordStrengthMeter } from '@/features/auth/components/PasswordInput';
import { fileToAvatarDataUrl, profileSections, type ProfileSearch } from './model';

function Row({ label, sub, children }: { label: ReactNode; sub?: ReactNode; children: ReactNode }) {
	return (
		<div className="grid gap-2 border-b border-border py-4 last:border-b-0 sm:grid-cols-[220px_1fr] sm:gap-6">
			<div><b className="block text-[13px]">{label}</b>{sub ? <span className="text-xs text-t2">{sub}</span> : null}</div>
			<div className="min-w-0">{children}</div>
		</div>
	);
}

/**
 * Profile photo, with upload and remove.
 *
 * Live, the file is sent to the API and the photo is then served from a URL of
 * its own — so it is the same picture on every device and for every teammate.
 * On mock data there is no server to send it to, so it is resized to a data URL
 * and kept in this browser, which is as far as the demo can honestly go.
 */
export function AvatarEditor({ user, size = 'lg', light }: { user: User; size?: 'lg' | 'xl'; light?: boolean }) {
	const live = isLiveApi();
	const org = useAuthStore((s) => s.org)!;
	const updateUser = useAuthStore((s) => s.updateUser);
	const updateMember = useDb((s) => s.updateMember);
	const avatar = useAvatarActions(org.slug);
	const inputRef = useRef<HTMLInputElement>(null);
	const [busy, setBusy] = useState(false);

	const pick = async (file?: File) => {
		if (!file) return;
		setBusy(true);
		try {
			if (live) await avatar.upload(file);
			else {
				// Both, on mock data: the store is what the shell reads, the member row
				// is what the team page and every assignee avatar read.
				const url = await fileToAvatarDataUrl(file);
				updateUser({ avatarUrl: url });
				updateMember(user.id, { avatarUrl: url });
			}
			toast('Profile photo updated', { tone: 'success', description: 'Shown to teammates, on tickets and in client replies.' });
		} catch (e) {
			// The server's own words when it has some: "…is larger than 5 MB",
			// "…files cannot be attached to your profile".
			toast(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Could not use that image', { tone: 'danger' });
		} finally {
			setBusy(false);
			// Cleared so choosing the same file again still fires a change event.
			if (inputRef.current) inputRef.current.value = '';
		}
	};

	return (
		<div className="relative inline-block">
			<Avatar name={user.name} tint={light ? 'dark' : (user.avatarTint ?? 'teal')} src={user.avatarUrl} className={cn(size === 'xl' ? 'size-[110px] text-3xl' : 'size-[84px] text-2xl', light && 'ring-4 ring-white/15')} />
			<button
				type="button"
				onClick={() => inputRef.current?.click()}
				disabled={busy}
				className={cn('absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-full border-2 border-white bg-brand-900 text-white shadow-card hover:bg-brand-800 disabled:opacity-60', light && 'border-brand-900 bg-white text-brand-900 hover:bg-brand-100')}
				aria-label={busy ? 'Uploading profile photo' : 'Change profile photo'}
				aria-busy={busy}
				data-tour="avatar-upload"
			>
				{busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
			</button>
			<input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} aria-label="Upload profile photo" />
		</div>
	);
}

/** "Remove photo", or the nudge that there is none yet. */
function AvatarNote({ user }: { user: User }) {
	const live = isLiveApi();
	const org = useAuthStore((s) => s.org)!;
	const updateUser = useAuthStore((s) => s.updateUser);
	const updateMember = useDb((s) => s.updateMember);
	const avatar = useAvatarActions(org.slug);
	const [busy, setBusy] = useState(false);

	if (!user.avatarUrl) return <span className="text-xs text-t3">No photo yet · click the camera to add one</span>;

	const remove = async () => {
		setBusy(true);
		try {
			if (live) await avatar.remove();
			else {
				updateUser({ avatarUrl: undefined });
				updateMember(user.id, { avatarUrl: undefined });
			}
			toast('Photo removed');
		} catch (e) {
			toast(e instanceof Error ? e.message : 'Could not remove that photo', { tone: 'danger' });
		} finally {
			setBusy(false);
		}
	};

	return (
		<button type="button" className="text-xs text-t2 hover:underline disabled:opacity-60" onClick={() => void remove()} disabled={busy}>
			<Trash2 size={11} className="me-1 inline" />
			{busy ? 'Removing…' : 'Remove photo'}
		</button>
	);
}

function ProfileSection({ user }: { user: User }) {
	const updateUser = useAuthStore((s) => s.updateUser);
	const org = useAuthStore((s) => s.org)!;
	const members = useDb((s) => s.members);
	const [first, ...rest] = user.name.split(' ');
	const [d, setD] = useState({ first: first ?? '', last: rest.join(' '), displayName: user.displayName ?? '', title: user.title ?? user.role, team: user.team ?? 'Service desk · Lagos', phone: user.phone ?? '', base: user.base ?? 'Lagos · Ikeja office', timezone: user.timezone ?? 'West Africa Time (GMT+1)', languages: user.languages ?? ['English'], signature: user.signature ?? '' });
	const [preview, setPreview] = useState(false);
	const dirty = JSON.stringify(d) !== JSON.stringify({ first: first ?? '', last: rest.join(' '), displayName: user.displayName ?? '', title: user.title ?? user.role, team: user.team ?? 'Service desk · Lagos', phone: user.phone ?? '', base: user.base ?? 'Lagos · Ikeja office', timezone: user.timezone ?? 'West Africa Time (GMT+1)', languages: user.languages ?? ['English'], signature: user.signature ?? '' });
	const teams = Array.from(new Set(members.map((m) => m.team)));
	const live = isLiveApi();
	const saveLive = useSaveProfile();
	const save = async () => {
		if (live) {
			try {
				await saveLive({ name: `${d.first.trim()} ${d.last.trim()}`.trim(), phone: d.phone.trim() || null, display_name: d.displayName, title: d.title, team: d.team, base: d.base, timezone: d.timezone, languages: d.languages, signature: d.signature });
				toast('Profile saved', { tone: 'success' });
			} catch (err) {
				toast(err instanceof ApiError ? Object.values(err.fieldErrors)[0]?.[0] ?? err.message : 'Could not save your profile.', { tone: 'danger' });
			}
			return;
		}
		updateUser({ name: `${d.first.trim()} ${d.last.trim()}`.trim(), displayName: d.displayName, title: d.title, team: d.team, phone: d.phone, phoneVerified: d.phone === user.phone ? user.phoneVerified : false, base: d.base, timezone: d.timezone, languages: d.languages, signature: d.signature });
		toast('Profile saved', { tone: 'success' });
	};
	return (
		<div className="space-y-4">
			<Card className="p-6">
				<div className="flex flex-wrap items-center gap-5">
					<AvatarEditor user={user} />
					<div className="min-w-0 flex-1">
						<h2 className="text-[22px] font-semibold">{user.name}</h2>
						<p className="text-[13px] text-t2">{user.title ?? user.role} · {org.name} · {user.base?.split(' · ')[0] ?? 'Lagos'}</p>
						<div className="mt-2 flex flex-wrap gap-1.5"><Pill tone={user.available === false ? 'closed' : 'done'}><span className="size-1.5 rounded-full bg-current" /> {user.available === false ? 'Away' : 'Available'}</Pill><Pill tone="teal">{user.role}</Pill><Pill tone="closed">Member since {user.memberSince ?? 'Sep 2026'}</Pill><AvatarNote user={user} /></div>
					</div>
					<div className="flex gap-2"><Button onClick={() => setPreview(true)}><Eye size={15} aria-hidden /> View as others see</Button><Button variant="primary" onClick={() => { void save(); }} disabled={!dirty}>Save changes</Button></div>
				</div>
			</Card>
			<Card className="p-6">
				<CardHeader title="Personal details" sub="Shown to teammates and, where marked, to clients in the portal and on WhatsApp." />
				<div className="mt-2">
					<Row label="Full name" sub="As it should appear on tickets"><div className="grid gap-2 sm:grid-cols-2"><Input value={d.first} onChange={(e) => setD({ ...d, first: e.target.value })} aria-label="First name" /><Input value={d.last} onChange={(e) => setD({ ...d, last: e.target.value })} aria-label="Last name" /></div></Row>
					<Row label="Display name" sub="Used in client-facing replies"><Input value={d.displayName} onChange={(e) => setD({ ...d, displayName: e.target.value })} placeholder={`${d.first} from ${org.name.split(' ')[0]} Support`} className="max-w-md" aria-label="Display name" /></Row>
					<Row label="Job title & team"><div className="grid gap-2 sm:grid-cols-2"><Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} aria-label="Job title" />{live ? <Input value={d.team} onChange={(e) => setD({ ...d, team: e.target.value })} placeholder="Team" aria-label="Team" /> : <Select value={d.team} onChange={(e) => setD({ ...d, team: e.target.value })} aria-label="Team">{Array.from(new Set([d.team, ...teams])).map((t) => <option key={t}>{t}</option>)}</Select>}</div></Row>
					<Row label="Work email" sub="Sign-in and notifications"><Input readOnly value={user.email} className="max-w-md bg-muted" trailing={<CheckCircle2 size={15} className="text-success" aria-label="Verified" />} aria-label="Work email" /><p className="mt-1.5 text-xs text-t2">{live ? 'Used to sign in · contact an admin to change it' : 'Verified · managed by Google Workspace'}</p></Row>
					<Row label="Mobile number" sub="OTP, SLA alerts, WhatsApp"><div className="flex flex-wrap items-center gap-2"><Input readOnly value="🇳🇬 +234" className="w-28 bg-muted" aria-label="Country code" /><Input value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} className="w-44" aria-label="Mobile number" />{live ? null : user.phoneVerified && d.phone === user.phone ? <Pill tone="done">Verified</Pill> : <Button size="sm" onClick={() => { updateUser({ phone: d.phone, phoneVerified: true }); toast('Code sent by SMS and WhatsApp', { description: 'Demo: number marked verified.' }); }}>Verify</Button>}</div></Row>
					<Row label="Base location" sub="Used for dispatch and travel time"><div className="grid gap-2 sm:grid-cols-2"><Select value={d.base} onChange={(e) => setD({ ...d, base: e.target.value })} leading={<Map size={14} />} aria-label="Base location">{['Lagos · Ikeja office', 'Lagos · Lekki base', 'Lagos · Yaba', 'Abuja · Wuse 2', 'Port Harcourt · Trans Amadi', 'Kano · Bompai', 'Remote'].map((b) => <option key={b}>{b}</option>)}</Select><Select value={d.timezone} onChange={(e) => setD({ ...d, timezone: e.target.value })} aria-label="Timezone"><option>West Africa Time (GMT+1)</option><option>GMT</option><option>Gulf Standard Time (GMT+4)</option></Select></div></Row>
					<Row label="Languages" sub="Reply templates and client translation"><div className="flex flex-wrap gap-1.5">{['English', 'Yoruba', 'Hausa', 'Igbo', 'Pidgin', 'French'].map((l) => { const on = d.languages.includes(l); return <button key={l} type="button" onClick={() => setD({ ...d, languages: on ? d.languages.filter((x) => x !== l) : [...d.languages, l] })} className={cn('rounded-sm px-3 py-1.5 text-[13px]', on ? 'bg-brand-100 font-medium text-brand-900' : 'border border-border-strong text-t2 hover:bg-muted')} aria-pressed={on}>{l}</button>; })}</div></Row>
					<Row label="Email signature" sub="Appended to email replies"><Textarea rows={3} value={d.signature} onChange={(e) => setD({ ...d, signature: e.target.value })} className="max-w-xl" aria-label="Email signature" /></Row>
				</div>
				<div className="mt-4 flex justify-end gap-3"><Button variant="ghost" disabled={!dirty} onClick={() => setD({ first: first ?? '', last: rest.join(' '), displayName: user.displayName ?? '', title: user.title ?? user.role, team: user.team ?? 'Service desk · Lagos', phone: user.phone ?? '', base: user.base ?? 'Lagos · Ikeja office', timezone: user.timezone ?? 'West Africa Time (GMT+1)', languages: user.languages ?? ['English'], signature: user.signature ?? '' })}>Discard</Button><Button variant="primary" onClick={() => { void save(); }} disabled={!dirty}>Save changes</Button></div>
			</Card>
			{preview ? (
				<div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(27,42,50,.35)] p-4" onClick={() => setPreview(false)} role="dialog" aria-label="How others see you">
					<div className="card w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
						<Avatar name={user.name} tint={user.avatarTint ?? 'teal'} src={user.avatarUrl} className="mx-auto size-20 text-2xl" />
						<b className="mt-3 block text-lg">{d.displayName || user.name}</b>
						<span className="text-[13px] text-t2">{d.title} · {org.name}</span>
						<div className="mt-3 rounded-[10px] bg-muted p-3 text-left text-[13px]"><span className="text-xs text-t2">WhatsApp reply preview</span><p className="mt-1">Good morning Mr Bakare, thanks for the photo. I've logged this as P1 (KS-2043).<br /><span className="text-t2">— {d.displayName || user.name}</span></p></div>
						<Button className="mt-4" onClick={() => setPreview(false)}>Close</Button>
					</div>
				</div>
			) : null}
		</div>
	);
}

function SecuritySection({ user }: { user: User }) {
	const updateUser = useAuthStore((s) => s.updateUser);
	const signOut = useAuthStore((s) => s.logout);
	const live = isLiveApi();
	const devices = useDevices();
	const now = useNow(60_000);
	const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
	const [err, setErr] = useState<string>();
	const saveProfile = useSaveProfile();

	/**
	 * Turning the second factor on or off.
	 *
	 * The switch reflects the store, and the store is only written from the
	 * server's answer, so a rejected change snaps back rather than leaving the
	 * UI claiming something the account does not do.
	 */
	const setTwoFactor = async (on: boolean) => {
		try {
			await saveProfile({ two_factor_enabled: on });
			toast(on ? 'Two-step verification on' : 'Two-step verification off', {
				tone: on ? 'success' : 'default',
				description: on ? 'We will email a code each time you sign in.' : 'Your password alone will sign you in.',
			});
		} catch (e) {
			toast(e instanceof ApiError ? e.message : 'Could not change that setting', { tone: 'danger' });
		}
	};
	const revoke = async (id: string) => {
		try {
			await api.del(`/auth/sessions/${id}`);
			toast('Session revoked', { tone: 'success' });
			await devices.refetch();
		} catch (e) {
			toast(e instanceof ApiError ? e.message : 'Could not revoke that session', { tone: 'danger' });
		}
	};
	const change = async () => {
		if (!pw.current) return setErr('Enter your current password');
		if (passwordStrength(pw.next).score < 2) return setErr('Use at least 8 characters with a mix of letters and numbers');
		if (pw.next !== pw.confirm) return setErr('Passwords do not match');
		setErr(undefined);
		if (live) {
			try {
				await api.post('/auth/password/change', { json: { current_password: pw.current, new_password: pw.next } });
			} catch (e) {
				setErr(e instanceof ApiError ? (e.fieldErrors.current_password?.[0] ?? e.fieldErrors.new_password?.[0] ?? e.message) : 'Could not change your password');
				return;
			}
			// The server ends every session, this one included.
			toast('Password changed', { tone: 'success', description: 'Sign in again with your new password.' });
			signOut();
			return;
		}
		setPw({ current: '', next: '', confirm: '' });
		updateUser({ passwordChangedDaysAgo: 0 });
		toast('Password changed', { tone: 'success', description: 'Other sessions were signed out.' });
	};
	return (
		<div className="grid gap-4 xl:grid-cols-[1fr_360px] [&>*]:min-w-0">
			<Card className="p-6">
				<CardHeader title="Change password" sub={live ? 'You will be signed out everywhere, including here, and sign in again.' : user.passwordChangedDaysAgo != null ? `Last changed ${user.passwordChangedDaysAgo === 0 ? 'just now' : `${user.passwordChangedDaysAgo} days ago`}${(user.passwordChangedDaysAgo ?? 0) > 80 ? ' · rotate soon' : ''}` : undefined} />
				<div className="mt-3 max-w-md space-y-3">
					<Field label="Current password">{(id) => <PasswordInput id={id} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />}</Field>
					<Field label="New password">{(id) => <><PasswordInput id={id} autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /><PasswordStrengthMeter password={pw.next} /></>}</Field>
					<Field label="Confirm new password" error={err}>{(id) => <PasswordInput id={id} autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />}</Field>
					<Button variant="primary" onClick={() => { void change(); }}>Update password</Button>
				</div>
			</Card>
			<div className="space-y-4">
				<Card className="p-6"><CardHeader title="Two-step verification" sub={live ? 'Ask for an emailed code as well as your password when you sign in.' : undefined} />{live ? <label className="mt-3 flex items-center gap-3 text-[13px]"><Switch on={user.twoFactor ?? false} onChange={(v) => { void setTwoFactor(v); }} label="Two-step verification" /> Email a one-time code at sign-in</label> : <><label className="mt-3 flex items-center gap-3 text-[13px]"><Switch on={user.twoFactor ?? true} onChange={(v) => { updateUser({ twoFactor: v }); toast(v ? '2FA enabled' : '2FA disabled', { tone: v ? 'success' : 'danger' }); }} label="Two-step verification" /> Authenticator app · WhatsApp/SMS backup</label><Button size="sm" className="mt-3" onClick={() => toast('Recovery codes', { description: 'Downloaded 8 one-time codes.' })}>Recovery codes</Button></>}</Card>
				<Card className="p-6"><CardHeader title="Active sessions" />{live ? <ul className="mt-2 divide-y divide-border text-[13px]">{devices.isPending ? <li className="py-2.5 text-t2">Loading…</li> : (devices.data ?? []).map((dv) => <li key={dv.id} className="flex items-center gap-3 py-2.5"><span className="min-w-0 flex-1">{describeDevice(dv.user_agent)}<span className="block text-xs text-t2">{dv.ip ? `${dv.ip} · ` : ''}{dv.current ? 'now' : relativeTime(Date.parse(dv.last_active_at), now)}</span></span>{dv.current ? <Pill tone="done">Current</Pill> : <Button size="sm" variant="ghost" onClick={() => { void revoke(dv.id); }}>Revoke</Button>}</li>)}</ul> : <ul className="mt-2 divide-y divide-border text-[13px]">{[['This browser · Lagos', 'now', true], ['Engineer app · iPhone', '3 min ago', false]].map(([l, t, cur]) => <li key={l as string} className="flex items-center gap-3 py-2.5"><span className="min-w-0 flex-1">{l as string}<span className="block text-xs text-t2">{t as string}</span></span>{cur ? <Pill tone="done">Current</Pill> : <Button size="sm" variant="ghost" onClick={() => toast('Session revoked', { tone: 'success' })}>Revoke</Button>}</li>)}</ul>}</Card>
			</div>
		</div>
	);
}

function AvailabilitySection({ user }: { user: User }) {
	const updateUser = useAuthStore((s) => s.updateUser);
	const updateMember = useDb((s) => s.updateMember);
	const ooo = user.outOfOffice ?? { on: false };
	const setAvailable = (v: boolean) => { updateUser({ available: v }); updateMember(user.id, { presence: v ? 'Active' : 'Away' }); toast(v ? 'You are available for dispatch' : 'Marked as away', { tone: v ? 'success' : 'default' }); };
	return (
		<div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
			<Card className="p-6">
				<CardHeader title="Availability" sub={isLiveApi() ? 'Saved in this browser only · not yet shared with dispatch.' : 'Dispatch and auto-assign only pick people who are available.'} />
				<div className="mt-2">
					<Row label="Status" sub={user.available === false ? 'Away · not auto-assigned' : `Available for dispatch · until ${user.availableUntil ?? '17:00'}`}><Switch on={user.available !== false} onChange={setAvailable} label="Available" /></Row>
					<Row label="Share live location" sub="Only while on a visit"><Switch on={!!user.shareLocation} onChange={(v) => updateUser({ shareLocation: v })} label="Share live location" /></Row>
					<Row label="Shift"><Select value={user.shift ?? 'Mon–Fri · 08:00–18:00'} onChange={(e) => updateUser({ shift: e.target.value })} className="max-w-xs" aria-label="Shift"><option>Mon–Fri · 08:00–18:00</option><option>Mon–Sat · 08:00–17:00</option><option>Early · 07:00–15:00</option><option>Late · 12:00–20:00</option></Select></Row>
				</div>
			</Card>
			<Card className="p-6">
				<CardHeader title="Out of office" sub={isLiveApi() ? 'Saved in this browser only · not yet applied to assignment.' : 'Reassigns new tickets and adds a note to your replies.'} />
				<div className="mt-2">
					<Row label="Out of office"><Switch on={ooo.on} onChange={(v) => updateUser({ outOfOffice: { ...ooo, on: v } })} label="Out of office" /></Row>
					<Row label="Dates"><div className="grid grid-cols-2 gap-2 max-w-sm"><Input type="date" value={ooo.from ?? ''} onChange={(e) => updateUser({ outOfOffice: { ...ooo, from: e.target.value } })} aria-label="From" /><Input type="date" value={ooo.to ?? ''} onChange={(e) => updateUser({ outOfOffice: { ...ooo, to: e.target.value } })} aria-label="To" /></div></Row>
					<Row label="Note"><Textarea rows={2} value={ooo.note ?? ''} onChange={(e) => updateUser({ outOfOffice: { ...ooo, note: e.target.value } })} placeholder="I'm away until Monday; Funke covers Lekki Fintech." className="max-w-md" aria-label="Out of office note" /></Row>
				</div>
			</Card>
		</div>
	);
}

function LanguageSection({ user }: { user: User }) {
	const updateUser = useAuthStore((s) => s.updateUser);
	const saveLive = useSaveProfile();
	const setTimezone = (timezone: string) => {
		if (!isLiveApi()) return updateUser({ timezone });
		saveLive({ timezone }).catch((e) => toast(e instanceof ApiError ? e.message : 'Could not save your timezone', { tone: 'danger' }));
	};
	return (
		<Card className="p-6"><CardHeader title="Language & region" /><div className="mt-2"><Row label="App language"><Select className="max-w-xs" defaultValue="English (NG)" aria-label="App language"><option>English (NG)</option><option>Yoruba</option><option>Hausa</option><option>Igbo</option></Select></Row><Row label="Timezone"><Select value={user.timezone ?? 'West Africa Time (GMT+1)'} onChange={(e) => setTimezone(e.target.value)} className="max-w-xs" aria-label="Timezone"><option>West Africa Time (GMT+1)</option><option>GMT</option><option>Gulf Standard Time (GMT+4)</option></Select></Row><Row label="Date & time"><Input readOnly value="10 Sep 2026 · 24h" className="max-w-xs bg-muted" aria-label="Date format" /></Row></div></Card>
	);
}

function ShortcutsSection() {
	const groups: [string, [string, string][]][] = [
		['Global', [['⌘K', 'Search or run a command'], ['?', 'Help menu'], ['G then D', 'Go to dashboard'], ['G then T', 'Go to tickets']]],
		['Lists', [['J / K', 'Move down / up'], ['Enter', 'Open'], ['A', 'Assign to me'], ['Esc', 'Close panel']]],
		['Ticket', [['⌘↵', 'Send reply'], ['S', 'Change status'], ['P', 'Change priority'], ['L', 'Add label']]],
	];
	return <div className="grid gap-4 md:grid-cols-3">{groups.map(([g, keys]) => <Card key={g} className="p-5"><h3 className="text-sm font-semibold">{g}</h3><ul className="mt-2 divide-y divide-border text-[13px]">{keys.map(([k, l]) => <li key={k} className="flex items-center justify-between py-2"><span>{l}</span><Kbd>{k}</Kbd></li>)}</ul></Card>)}</div>;
}

export function ProfilePage() {
	const org = useAuthStore((s) => s.org)!;
	const user = useAuthStore((s) => s.user)!;
	const search = useSearch({ from: '/authed/$org/me' });
	const navigate = useNavigate();
	const section = search.section;
	const [confirmSignOut, setConfirmSignOut] = useState(false);
	const setSection = (s: ProfileSearch['section']) => navigate({ to: '/$org/me', params: { org: org.slug }, search: { section: s } });
	const title = profileSections.flatMap((g) => g.items).find(([k]) => k === section)?.[1] ?? 'Profile';
	const tickets = useDb((s) => s.tickets);
	const resolved = tickets.filter((t) => t.assigneeId === user.id && t.resolvedAt).length + 36;

	const profileState = useLiveProfile();
	const body = !profileState.ready ? <Card className="p-6 text-[13px] text-t2">{profileState.failed ? 'Could not load your profile.' : 'Loading your profile…'}</Card> : section === 'profile' ? <ProfileSection user={user} /> : section === 'security' ? <SecuritySection user={user} /> : section === 'availability' ? <AvailabilitySection user={user} /> : section === 'language' ? <LanguageSection user={user} /> : section === 'shortcuts' ? <ShortcutsSection /> : (
		<Card className="p-6"><CardHeader title="Notifications" sub="Delivery preferences live on the Notifications page." /><Link to="/$org/notifications" params={{ org: org.slug }} search={{}} className="mt-4 inline-block"><Button variant="primary"><Bell size={15} aria-hidden /> Open notification preferences</Button></Link></Card>
	);

	const mobileItems: { key: ProfileSearch['section']; icon: typeof UserIcon; label: string; sub: string }[] = [
		{ key: 'profile', icon: UserIcon, label: 'Personal details', sub: `+234 ${user.phone ?? '…'} · ${(user.languages ?? ['English']).join(', ')}` },
		{ key: 'security', icon: Lock, label: 'Security & password', sub: isLiveApi() ? 'Password and signed-in devices' : `Changed ${user.passwordChangedDaysAgo ?? 84} days ago${(user.passwordChangedDaysAgo ?? 84) > 80 ? ' · rotate soon' : ''}` },
		{ key: 'notifications', icon: Bell, label: 'Notifications', sub: 'Push · SMS for SLA alerts' },
		{ key: 'availability', icon: CalendarDays, label: 'Shifts & leave', sub: user.shift ?? 'Mon–Fri' },
		{ key: 'shortcuts', icon: Keyboard, label: 'Keyboard shortcuts', sub: '⌘K, J/K, A' },
	];

	return (
		<AppShell
			meta={{ title: 'My account', subtitle: title }}
			mobileHeader={
				<MobileHeader className="pb-5">
					<div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Profile</h1>{section !== 'profile' ? <button type="button" className="text-[13px] text-on-dark-muted" onClick={() => setSection('profile')}>Back</button> : null}</div>
					<div className="mt-3 flex items-center gap-4"><AvatarEditor user={user} light /><div className="min-w-0"><b className="block truncate text-lg font-semibold">{user.name}</b><span className="block truncate text-[13px] text-on-dark-muted">{user.title ?? user.role} · {user.base?.split(' · ').pop() ?? org.name}</span><div className="mt-1.5 flex gap-1.5"><Pill tone={user.available === false ? 'closed' : 'done'}><span className="size-1.5 rounded-full bg-current" /> {user.available === false ? 'Away' : 'On shift'}</Pill><span className="rounded-full bg-white/15 px-2 py-px text-[11px] font-semibold">{user.twoFactor === false ? '2FA off' : '2FA on'}</span></div></div></div>
					<div className="mt-4 grid grid-cols-3 gap-2.5">{[[resolved, 'Resolved · Sep'], ['4.8', 'CSAT'], ['84%', 'Utilisation']].map(([v, l]) => <div key={l as string} className="rounded-md bg-white/10 p-3"><b className="tabular block text-[22px]">{v as string}</b><span className="text-xs text-on-dark-muted">{l as string}</span></div>)}</div>
				</MobileHeader>
			}
		>
			{/* Mobile: section list on the profile tab, section body otherwise */}
			<div className="lg:hidden">
				{section === 'profile' ? (
					<div className="space-y-4">
						<div><h2 className="mb-2 text-[11px] font-semibold tracking-wider text-t2 uppercase">Availability</h2><div className="divide-y divide-border rounded-md bg-white shadow-card"><div className="flex items-center gap-3 p-4"><span className="grid size-11 place-items-center rounded-[10px] bg-success-bg text-success-fg"><CheckCircle2 size={20} /></span><div className="min-w-0 flex-1"><b className="block">Status</b><span className="text-[13px] text-t2">{user.available === false ? 'Away' : `Available for dispatch · until ${user.availableUntil ?? '17:00'}`}</span></div><Switch on={user.available !== false} onChange={(v) => { useAuthStore.getState().updateUser({ available: v }); useDb.getState().updateMember(user.id, { presence: v ? 'Active' : 'Away' }); }} label="Available" /></div><div className="flex items-center gap-3 p-4"><span className="grid size-11 place-items-center rounded-[10px] bg-info-bg text-info-fg"><MapPin size={20} /></span><div className="min-w-0 flex-1"><b className="block">Share live location</b><span className="text-[13px] text-t2">Only while on a visit</span></div><Switch on={!!user.shareLocation} onChange={(v) => useAuthStore.getState().updateUser({ shareLocation: v })} label="Share live location" /></div></div></div>
						<div><h2 className="mb-2 text-[11px] font-semibold tracking-wider text-t2 uppercase">Account</h2><div className="divide-y divide-border rounded-md bg-white shadow-card">{mobileItems.map((it) => <button key={it.key} type="button" onClick={() => setSection(it.key)} className="flex w-full items-center gap-3 p-4 text-left"><span className="grid size-11 place-items-center rounded-[10px] bg-muted text-t2"><it.icon size={20} /></span><div className="min-w-0 flex-1"><b className="block">{it.label}</b><span className="block truncate text-[13px] text-t2">{it.sub}</span></div><ChevronRight size={18} className="text-t3" /></button>)}</div></div>
						<div><h2 className="mb-2 text-[11px] font-semibold tracking-wider text-t2 uppercase">App</h2><div className="rounded-md bg-white shadow-card"><button type="button" onClick={() => setConfirmSignOut(true)} className="flex w-full items-center gap-3 p-4 text-left text-danger-fg"><span className="grid size-11 place-items-center rounded-[10px] bg-danger-bg"><Shield size={20} /></span><b>Sign out</b></button></div></div>
					</div>
				) : body}
			</div>

			<LogoutDialog open={confirmSignOut} onClose={() => setConfirmSignOut(false)} />

			<div className="hidden gap-4 lg:grid lg:grid-cols-[250px_minmax(0,1fr)] [&>*]:min-w-0">
				<Card className="h-max p-3">
					{profileSections.map((g) => <div key={g.group} className="mb-2"><div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-t2 uppercase">{g.group}</div>{g.items.map(([k, l]) => <button key={k} type="button" onClick={() => setSection(k)} className={cn('block w-full rounded-sm px-3 py-2 text-left text-[13px] text-t2 hover:bg-muted hover:text-t1', section === k && 'bg-brand-100 font-semibold text-brand-900')}>{l}</button>)}</div>)}
					<div className="mb-2"><div className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-t2 uppercase">Danger zone</div><button type="button" onClick={() => toast('Ask an admin to deactivate your account', { tone: 'danger' })} className="block w-full rounded-sm px-3 py-2 text-left text-[13px] text-danger-fg hover:bg-danger-bg/50">Deactivate account</button></div>
				</Card>
				<div>{body}</div>
			</div>
		</AppShell>
	);
}
