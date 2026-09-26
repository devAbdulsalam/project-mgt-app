import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Bell } from 'lucide-react';
import { useAuthStore } from '@/shared/lib/auth-store';
import { useNow } from '@/shared/lib/time';
import { isLiveApi } from '@/shared/lib/live-api';
import { NotificationIcon, NotificationSentence } from './NotificationItem';
import { useUnreadCount } from '../api';
import { useNotificationActions, useNotificationList } from '../hooks/useNotificationList';
import { relativeTime } from '@/shared/lib/time';

export function BellPopover() {
	const org = useAuthStore((s) => s.org)!;
	const { items: notifications } = useNotificationList(org.slug, 'all');
	const { markAllRead, markRead } = useNotificationActions();
	const now = useNow(30_000);
	const live = isLiveApi();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const unread = useUnreadCount();
	const latest = [...notifications].sort((a, b) => Number(a.read) - Number(b.read) || b.at - a.at).slice(0, 4);

	useEffect(() => {
		if (!open) return;
		const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
		document.addEventListener('mousedown', onDoc);
		document.addEventListener('keydown', onKey);
		return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
	}, [open]);

	return (
		<div ref={ref} className="relative">
			<button type="button" onClick={() => setOpen((o) => !o)} className="relative hover:text-t1" aria-label={`Notifications, ${unread} unread`} aria-expanded={open} aria-haspopup="dialog">
				<Bell size={18} />
				{unread ? <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full border-2 border-white bg-danger" aria-hidden /> : null}
			</button>
			{open ? (
				<div role="dialog" aria-label="Latest notifications" className="absolute top-full right-0 z-40 mt-3 w-[470px] rounded-[14px] border border-border bg-white shadow-pop">
					<div className="flex items-center justify-between px-5 pt-4 pb-3"><b className="text-[15px]">Notifications</b><button type="button" onClick={() => markAllRead()} className="text-[13px] text-brand-600 hover:underline">Mark all read</button></div>
					<ul className="divide-y divide-border">
						{latest.map((n) => (
							<li key={n.id} className="flex items-start gap-3 px-5 py-3">
								<span className={`mt-3 size-1.5 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-brand-600'}`} aria-hidden />
								<NotificationIcon n={n} size="sm" />
								<div className="min-w-0 flex-1 text-[13px]">
									{n.ticketKey || !live ? (
										<Link to="/$org/tickets/$key" params={{ org: org.slug, key: n.ticketKey ?? 'KS-2043' }} search={{}} onClick={() => { markRead(n.id); setOpen(false); }} className="block hover:underline">
											<NotificationSentence n={n} now={now} compact />
										</Link>
									) : (
										// Not every notification points at a ticket (an invoice falling due, say).
										<button type="button" onClick={() => markRead(n.id)} className="block text-left hover:underline">
											<NotificationSentence n={n} now={now} compact />
										</button>
									)}
									<div className="mt-0.5 text-xs text-t3">{relativeTime(n.at, now)}</div>
								</div>
							</li>
						))}
						{latest.length === 0 ? <li className="px-5 py-6 text-center text-[13px] text-t3">You're all caught up.</li> : null}
					</ul>
					<div className="border-t border-border px-5 py-3 text-center"><Link to="/$org/notifications" params={{ org: org.slug }} search={{}} onClick={() => setOpen(false)} className="text-[13px] font-medium text-brand-600 hover:underline">View all notifications</Link></div>
				</div>
			) : null}
		</div>
	);
}
