import { useMemo, useRef } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Bell, CheckCheck, Settings, Sun } from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import { Button, Card, DarkChips, EmptyState, PillTabs } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { useNow } from '@/shared/lib/time';
import { unreadCount, useDb } from '@/mocks/db';
import { toast } from '@/shared/lib/toast-store';
import type { Notification, NotificationPrefs } from '@/mocks/types';
import { NotificationRow } from '../components/NotificationItem';

import type { NotificationFilter as Filter } from '../model';

function matches(n: Notification, f: Filter, now: number) {
	if (n.snoozedUntil && n.snoozedUntil > now && f !== 'all') return false;
	switch (f) {
		case 'all': return true;
		case 'unread': return !n.read;
		case 'mentions': return n.kind === 'mention';
		case 'assigned': return n.kind === 'assigned';
		case 'sla': return n.kind === 'sla' || n.kind === 'status' || n.kind === 'automation';
	}
}

function groupLabel(at: number, now: number) {
	const d = new Date(at); const t = new Date(now);
	const dayStart = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
	if (at >= dayStart) return 'Today';
	if (at >= dayStart - 86_400_000) return 'Yesterday';
	return `${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}`;
}

const prefRows: { key: keyof NotificationPrefs; label: string; sub: string }[] = [
	{ key: 'mentions', label: 'Mentions', sub: 'In-app · Email · Push' },
	{ key: 'assignments', label: 'Assignments', sub: 'In-app · Push' },
	{ key: 'sla', label: 'SLA & alerts', sub: 'In-app · Email · Push · SMS' },
	{ key: 'statusChanges', label: 'Status changes on watched', sub: 'In-app' },
	{ key: 'automationDigest', label: 'Automation digests', sub: 'Daily email' },
	{ key: 'sprintEvents', label: 'Sprint events', sub: 'In-app' },
];

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
	return (
		<button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', on ? 'bg-brand-900' : 'bg-border-strong')}>
			<span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]', on ? 'left-[22px]' : 'left-0.5')} />
		</button>
	);
}

export function NotificationsPage() {
	const org = useAuthStore((s) => s.org)!;
	const navigate = useNavigate();
	const { filter } = useSearch({ from: '/authed/$org/notifications' });
	const notifications = useDb((s) => s.notifications);
	const prefs = useDb((s) => s.prefs);
	const setPrefs = useDb((s) => s.setPrefs);
	const markAllRead = useDb((s) => s.markAllRead);
	const now = useNow(30_000);
	const prefsRef = useRef<HTMLDivElement>(null);
	const unread = unreadCount(notifications);
	const mentions = notifications.filter((n) => n.kind === 'mention' && !n.read).length;

	const setFilter = (f: Filter) => navigate({ to: '/$org/notifications', params: { org: org.slug }, search: { filter: f }, replace: true });
	const list = useMemo(() => [...notifications].filter((n) => matches(n, filter, now)).sort((a, b) => b.at - a.at), [notifications, filter, now]);
	const groups = useMemo(() => { const m = new Map<string, Notification[]>(); list.forEach((n) => { const g = groupLabel(n.at, now); m.set(g, [...(m.get(g) ?? []), n]); }); return Array.from(m.entries()); }, [list, now]);

	const counts = {
		all: notifications.length,
		unread,
		mentions: notifications.filter((n) => n.kind === 'mention').length,
		assigned: notifications.filter((n) => n.kind === 'assigned').length,
		sla: notifications.filter((n) => n.kind === 'sla' || n.kind === 'status' || n.kind === 'automation').length,
	};
	const tabs = [
		{ key: 'all' as const, label: 'All', count: counts.all },
		{ key: 'unread' as const, label: 'Unread', count: counts.unread },
		{ key: 'mentions' as const, label: 'Mentions', count: counts.mentions },
		{ key: 'assigned' as const, label: 'Assigned to me', count: counts.assigned },
		{ key: 'sla' as const, label: 'SLA & alerts', count: counts.sla },
	];

	const enablePush = async () => {
		if (typeof Notification === 'undefined') return toast('Push not supported in this browser');
		const perm = await Notification.requestPermission();
		setPrefs({ push: perm === 'granted' });
		toast(perm === 'granted' ? 'Browser push enabled' : 'Push permission was not granted', { tone: perm === 'granted' ? 'success' : 'danger' });
	};

	return (
		<AppShell
			meta={{ title: 'Notifications', subtitle: `${unread} unread · ${mentions} mentions` }}
			mobileHeader={
				<MobileHeader>
					<div className="flex items-center justify-between"><h1 className="text-xl font-semibold">Inbox</h1><button type="button" onClick={markAllRead} className="text-[13px] text-on-dark-muted">Mark all read</button></div>
					<DarkChips items={tabs.map((t) => ({ ...t, label: t.key === 'assigned' ? 'Assigned' : t.key === 'sla' ? 'SLA' : t.label }))} value={filter} onChange={setFilter} className="mt-3" />
				</MobileHeader>
			}
		>
			<div className="hidden flex-wrap items-center gap-3 lg:flex">
				<PillTabs items={tabs} value={filter} onChange={setFilter} className="min-w-0 flex-1" ariaLabel="Notification filter" />
				<Button onClick={markAllRead} disabled={!unread}><CheckCheck size={15} aria-hidden /> Mark all read</Button>
				<Button iconOnly aria-label="Notification settings" onClick={() => prefsRef.current?.scrollIntoView({ behavior: 'smooth' })}><Settings size={15} /></Button>
			</div>

			<div className="mt-0 grid gap-4 lg:mt-4 lg:grid-cols-[minmax(0,1fr)_380px] [&>*]:min-w-0">
				<Card className="overflow-hidden">
					{list.length === 0 ? <EmptyState icon={<Bell size={20} />} title="You're all caught up">No notifications in this view.</EmptyState> : null}
					{groups.map(([label, items]) => (
						<section key={label}>
							<h3 className="border-b border-border bg-[#fafbfc] px-6 py-2.5 text-[11px] font-semibold tracking-wider text-t2 uppercase">{label}</h3>
							<div className="divide-y divide-border">
								{items.map((n) => <NotificationRow key={n.id} n={n} now={now} />)}
							</div>
						</section>
					))}
				</Card>

				<div className="space-y-4" ref={prefsRef}>
					<Card className="p-5">
						<h3 className="text-sm font-semibold">Delivery preferences</h3>
						<ul className="mt-2 divide-y divide-border">
							{prefRows.map((r) => (
								<li key={r.key} className="flex items-center gap-3 py-3 text-[13px]"><div className="flex-1"><b className="block font-medium">{r.label}</b><span className="text-xs text-t2">{r.sub}</span></div><Toggle on={prefs[r.key]} onChange={(v) => setPrefs({ [r.key]: v })} label={r.label} /></li>
							))}
						</ul>
					</Card>
					<Card className="p-5">
						<div className="flex items-center gap-2 text-sm font-semibold"><Bell size={16} className="text-brand-700" aria-hidden /> Browser push</div>
						<p className="mt-1.5 text-[13px] text-t2">Get SLA alerts and mentions even when this tab is in the background.</p>
						{prefs.push ? <p className="mt-3 text-[13px] text-success-fg">Push is enabled on this browser.</p> : <Button variant="primary" className="mt-3" onClick={enablePush}>Enable push</Button>}
					</Card>
					<Card className="p-5">
						<div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold"><Sun size={16} className="text-warning" aria-hidden /> Quiet hours</div><Toggle on={prefs.quietHours} onChange={(v) => setPrefs({ quietHours: v })} label="Quiet hours" /></div>
						<p className="mt-1.5 text-[13px] text-t2">22:00 – 07:00 West Africa Time · SLA alerts still delivered</p>
					</Card>
				</div>
			</div>
		</AppShell>
	);
}
