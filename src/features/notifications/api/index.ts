// The live-API adapter for notifications.
//
// The backend speaks snake_case with ISO timestamps and its own `kind` values;
// the app's Notification type is camelCase with epoch milliseconds and a
// slightly different vocabulary. Everything that differs is translated here.

import { useMutation, useQuery, useQueryClient, queryOptions } from '@tanstack/react-query';
import { api } from '@/api';
import { unreadCount, useDb } from '@/mocks/db';
import { isLiveApi } from '@/shared/lib/live-api';
import { useAuthStore } from '@/shared/lib/auth-store';
import type { Notification, NotificationKind } from '@/mocks/types';

interface NotificationDto {
	id: string;
	kind: string;
	title: string;
	body: string | null;
	ticket_id: string | null;
	ticket_key: string | null;
	actor_id: string | null;
	actor_name: string | null;
	read_at: string | null;
	snoozed_until: string | null;
	created_at: string;
}

interface NotificationListDto {
	data: NotificationDto[];
	unread: number;
}

/**
 * The backend distinguishes more kinds than the UI renders, so several map onto
 * one. `sla_at_risk` and `sla_breached` are both "sla" to a reader deciding
 * what to look at.
 */
const KIND_MAP: Record<string, NotificationKind> = {
	mention: 'mention',
	assigned: 'assigned',
	commented: 'mention',
	status_changed: 'status',
	sla_at_risk: 'sla',
	sla_breached: 'sla',
	visit_scheduled: 'status',
	invoice_due: 'status',
};

/**
 * The backend stores a whole sentence ("Chinedu assigned KS-2043 to you"); the
 * UI renders the actor in bold and the key as a link, so both are cut out of
 * the title and put back as `{key}` and `actorName`.
 */
function sentenceOf(dto: NotificationDto): string {
	let title = dto.title;
	if (dto.actor_name && title.startsWith(dto.actor_name)) title = title.slice(dto.actor_name.length).trimStart();
	if (dto.ticket_key && title.includes(dto.ticket_key)) title = title.replace(dto.ticket_key, '{key}');
	return title;
}

function toDomain(dto: NotificationDto): Notification {
	return {
		id: dto.id,
		kind: KIND_MAP[dto.kind] ?? 'status',
		at: Date.parse(dto.created_at),
		read: dto.read_at !== null,
		snoozedUntil: dto.snoozed_until ? Date.parse(dto.snoozed_until) : undefined,
		actorName: dto.actor_name ?? undefined,
		actorId: dto.actor_id ?? undefined,
		ticketKey: dto.ticket_key ?? undefined,
		title: sentenceOf(dto),
		body: dto.body ?? undefined,
	};
}

export const notificationKeys = {
	all: ['notifications'] as const,
	list: (org: string, filter: string) => ['notifications', 'list', org, filter] as const,
	prefs: (org: string) => ['notifications', 'prefs', org] as const,
};

export function notificationsQuery(org: string, filter: string) {
	return queryOptions({
		queryKey: notificationKeys.list(org, filter),
		queryFn: async ({ signal }) => {
			const page = await api.get<NotificationListDto>(`/orgs/${org}/notifications`, {
				query: { filter, limit: 100 },
				signal,
			});
			return { items: page.data.map(toDomain), unread: page.unread };
		},
		// Short, because an inbox that is minutes stale feels broken.
		staleTime: 15_000,
	});
}

export function useNotifications(org: string, filter: string) {
	return useQuery({ ...notificationsQuery(org, filter), enabled: isLiveApi() && Boolean(org) });
}

/**
 * The unread badge, from whichever source is active. Live, it polls a
 * one-row page (the response carries the total), so the badge stays fresh
 * without loading the inbox.
 */
export function useUnreadCount(): number {
	const org = useAuthStore((s) => s.org?.slug ?? '');
	const mock = useDb((s) => unreadCount(s.notifications));
	const live = isLiveApi();
	const query = useQuery({
		queryKey: [...notificationKeys.all, 'unread', org],
		queryFn: async ({ signal }) => (await api.get<NotificationListDto>(`/orgs/${org}/notifications`, { query: { filter: 'unread', limit: 1 }, signal })).unread,
		enabled: live && Boolean(org),
		staleTime: 20_000,
		refetchInterval: 60_000,
	});
	return live ? (query.data ?? 0) : mock;
}

export function useMarkRead(org: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.post(`/orgs/${org}/notifications/${id}/read`),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
	});
}

export function useMarkAllRead(org: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => api.post(`/orgs/${org}/notifications/read-all`),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
	});
}

export function useSnooze(org: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, minutes }: { id: string; minutes: number }) =>
			api.post(`/orgs/${org}/notifications/${id}/snooze`, { json: { minutes } }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
	});
}

// -- Preferences ------------------------------------------------------------

interface PrefsDto {
	in_app: Record<string, boolean>;
	email: Record<string, boolean>;
	digest: 'off' | 'daily' | 'weekly';
}

/**
 * The UI groups preferences by topic; the backend keys them by notification
 * kind. One UI switch can therefore cover two kinds — "SLA alerts" covers both
 * at-risk and breached. `email` marks the topics whose row promises email too.
 */
const TOPICS = {
	mentions: { kinds: ['mention', 'commented'], email: true },
	assignments: { kinds: ['assigned'], email: false },
	sla: { kinds: ['sla_at_risk', 'sla_breached'], email: true },
	statusChanges: { kinds: ['status_changed'], email: false },
} as const;

export type PrefTopic = keyof typeof TOPICS | 'automationDigest';
export type TopicPrefs = Record<PrefTopic, boolean>;

const DEFAULT_PREFS: PrefsDto = { in_app: {}, email: {}, digest: 'daily' };

export function prefsToTopics(dto: PrefsDto): TopicPrefs {
	const topics = { automationDigest: dto.digest !== 'off' } as TopicPrefs;
	for (const [topic, { kinds }] of Object.entries(TOPICS)) {
		// On unless every kind behind it is switched off, so a half-configured
		// topic still reads as enabled rather than silently appearing disabled.
		topics[topic as keyof typeof TOPICS] = kinds.some((kind) => dto.in_app[kind] !== false);
	}
	return topics;
}

/** The full preferences after one switch is flipped. The endpoint replaces the row, so nothing else may be dropped. */
export function applyTopic(dto: PrefsDto, topic: PrefTopic, on: boolean): PrefsDto {
	if (topic === 'automationDigest') return { ...dto, digest: on ? 'daily' : 'off' };
	const { kinds, email } = TOPICS[topic];
	const in_app = { ...dto.in_app };
	const emailPrefs = { ...dto.email };
	for (const kind of kinds) {
		in_app[kind] = on;
		if (email) emailPrefs[kind] = on;
	}
	return { ...dto, in_app, email: emailPrefs };
}

export function usePrefs(org: string) {
	return useQuery({
		queryKey: notificationKeys.prefs(org),
		queryFn: ({ signal }) => api.get<PrefsDto>(`/orgs/${org}/notifications/prefs`, { signal }),
		enabled: isLiveApi() && Boolean(org),
	});
}

export function useSavePrefs(org: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (prefs: PrefsDto) => api.put<PrefsDto>(`/orgs/${org}/notifications/prefs`, { json: prefs }),
		// Optimistic: a switch that waits on the network feels broken.
		onMutate: async (prefs) => {
			await queryClient.cancelQueries({ queryKey: notificationKeys.prefs(org) });
			const previous = queryClient.getQueryData<PrefsDto>(notificationKeys.prefs(org));
			queryClient.setQueryData(notificationKeys.prefs(org), prefs);
			return { previous };
		},
		onError: (_err, _prefs, context) => {
			if (context?.previous) queryClient.setQueryData(notificationKeys.prefs(org), context.previous);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.prefs(org) }),
	});
}

/** The switches the page shows, read from and written to the API. */
export function useTopicPrefs(org: string) {
	const query = usePrefs(org);
	const save = useSavePrefs(org);
	const dto = query.data ?? DEFAULT_PREFS;
	return {
		topics: prefsToTopics(dto),
		loading: query.isPending,
		set: (topic: PrefTopic, on: boolean) => save.mutate(applyTopic(dto, topic, on)),
	};
}
