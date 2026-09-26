// The notification inbox and its actions, from whichever source is active.
//
// The rows, the bell and the page all want the same four things — the list,
// mark-read, mark-all-read and snooze — and none of them should care whether
// they come from the mock store or the API.

import { useDb } from '@/mocks/db';
import { isLiveApi } from '@/shared/lib/live-api';
import { useAuthStore } from '@/shared/lib/auth-store';
import type { Notification } from '@/mocks/types';
import { useMarkAllRead, useMarkRead, useNotifications, useSnooze } from '../api';

export interface NotificationActions {
	markRead: (id: string, read?: boolean) => void;
	markAllRead: () => void;
	snooze: (id: string, minutes: number) => void;
}

export function useNotificationActions(): NotificationActions {
	const org = useAuthStore((s) => s.org?.slug ?? '');
	const live = isLiveApi();

	const mockMarkRead = useDb((s) => s.markRead);
	const mockMarkAllRead = useDb((s) => s.markAllRead);
	const mockSnooze = useDb((s) => s.snooze);

	const liveMarkRead = useMarkRead(org);
	const liveMarkAllRead = useMarkAllRead(org);
	const liveSnooze = useSnooze(org);

	if (!live) return { markRead: mockMarkRead, markAllRead: mockMarkAllRead, snooze: mockSnooze };

	return {
		// The API can only mark read. "Mark unread" is a mock-store nicety, so the
		// row does not offer it live.
		markRead: (id, read = true) => {
			if (read) liveMarkRead.mutate(id);
		},
		markAllRead: () => liveMarkAllRead.mutate(),
		snooze: (id, minutes) => liveSnooze.mutate({ id, minutes }),
	};
}

/** The signed-in person's notifications, newest first, filtered server-side when live. */
export function useNotificationList(org: string, filter: string): { items: Notification[]; unread: number | undefined; loading: boolean } {
	const live = isLiveApi();
	const mock = useDb((s) => s.notifications);
	const query = useNotifications(org, filter);

	if (!live) return { items: mock, unread: undefined, loading: false };
	return { items: query.data?.items ?? [], unread: query.data?.unread, loading: query.isPending };
}
