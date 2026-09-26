// Ticket mutations, from whichever source is active.
//
// The components call these with the same signatures the mock store used, so
// wiring a screen to the live API is a change of import rather than a rewrite.
//
// Two things the mock never had to deal with:
//
//   version  every write carries the version it read, and a 409 means someone
//            else got there first. The caller is told to reload rather than
//            having its edit silently dropped.
//   labels   the server stores display labels as values ('in_progress'), so
//            status goes through the mapper on the way out.

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useDb } from '@/mocks/db';
import { isLiveApi } from '@/shared/lib/live-api';
import { toast } from '@/shared/lib/toast-store';
import type { Status, Ticket } from '@/mocks/types';
import { statusToWire, priorityToWire, ticketDtoToDomain } from '../api/mapper';
import type { TicketDto } from '../api/contracts';
import { ticketKeys } from '../api/queryKeys';
import { useActor } from './useActor';
import { useAuthStore } from '@/shared/lib/auth-store';

export interface TicketActions {
	transition: (ticket: Ticket, to: Status) => Promise<boolean>;
	assign: (ticket: Ticket, assigneeId: string | undefined) => Promise<void>;
	setPriority: (ticket: Ticket, priority: Ticket['priority']) => Promise<void>;
	updateTicket: (ticket: Ticket, patch: { title?: string; description?: string }) => Promise<void>;
	addComment: (ticket: Ticket, body: string, internal: boolean) => Promise<void>;
	setLabels: (ticket: Ticket, labels: string[]) => Promise<void>;
	toggleWatch: (ticket: Ticket) => Promise<void>;
	logTime: (ticket: Ticket, minutes: number) => Promise<void>;
	deleteTicket: (ticket: Ticket) => Promise<void>;
	/** Escape hatch for properties with no dedicated action (due date, points). */
	patchFields: (ticket: Ticket, fields: Record<string, unknown>) => Promise<void>;
}

/** Reports a version clash in the one way that is actually useful. */
function handleWriteError(err: unknown, fallback: string): void {
	if (err instanceof ApiError && err.code === 'version_conflict') {
		toast('Someone else changed this ticket. Reload to see their version.', { tone: 'danger' });
		return;
	}
	if (err instanceof ApiError && err.code === 'illegal_transition') {
		toast(err.message, { tone: 'danger' });
		return;
	}
	toast(err instanceof ApiError ? err.message : fallback, { tone: 'danger' });
}

/**
 * `orgSlug` defaults to the active workspace, so the deeply nested components
 * that perform these writes do not have to be given it as a prop.
 */
export function useTicketActions(orgSlugArg?: string): TicketActions {
	const activeOrg = useAuthStore((s) => s.org?.slug);
	const orgSlug = orgSlugArg ?? activeOrg ?? '';
	const live = isLiveApi();
	const actor = useActor();
	const queryClient = useQueryClient();

	const db = useDb();

	/** Refreshes every ticket view after a write. */
	const invalidate = useCallback(
		(key?: string) => {
			queryClient.invalidateQueries({ queryKey: ticketKeys.all });
			if (key) queryClient.invalidateQueries({ queryKey: ticketKeys.detail(key) });
		},
		[queryClient],
	);

	/** The ticket's current version, which the mock domain type does not carry. */
	const versionOf = useCallback(
		async (key: string): Promise<number> => {
			const dto = await api.get<TicketDto>(`/orgs/${orgSlug}/tickets/${key}`);
			return dto.version;
		},
		[orgSlug],
	);

	const patch = useCallback(
		async (key: string, body: Record<string, unknown>) => {
			const version = await versionOf(key);
			await api.patch<TicketDto>(`/orgs/${orgSlug}/tickets/${key}`, { json: { ...body, version } });
			invalidate(key);
		},
		[orgSlug, versionOf, invalidate],
	);

	if (!live) {
		// The mock store's actions, adapted to the same async signatures so the
		// calling component does not branch.
		return {
			async transition(ticket, to) {
				const ok = db.transition(ticket.key, to, actor);
				// Reported here rather than at each call site, so an illegal move
				// reads the same whether it came from the board or the detail panel.
				if (!ok) {
					toast(`Cannot move ${ticket.key} to ${to} from ${ticket.status}.`, { tone: 'danger' });
				}
				return ok;
			},
			async assign(ticket, assigneeId) {
				db.assign(ticket.key, assigneeId, actor);
			},
			async setPriority(ticket, priority) {
				db.setPriority(ticket.key, priority, actor);
			},
			async updateTicket(ticket, patchBody) {
				db.updateTicket(ticket.key, patchBody, actor);
			},
			async addComment(ticket, body, internal) {
				db.addComment(ticket.key, { body, internal }, actor);
			},
			async setLabels(ticket, labels) {
				for (const label of labels) if (!ticket.labels.includes(label)) db.addLabel(ticket.key, label, actor);
				for (const label of ticket.labels) if (!labels.includes(label)) db.removeLabel(ticket.key, label, actor);
			},
			async toggleWatch(ticket) {
				db.toggleWatch(ticket.key, actor.id);
			},
			async logTime(ticket, minutes) {
				db.logTime(ticket.key, minutes, actor);
			},
			async deleteTicket(ticket) {
				db.deleteTicket(ticket.key);
			},
			async patchFields(ticket, fields) {
				// The mock store keeps camelCase domain fields.
				const patchBody: Record<string, unknown> = {};
				if ('due_at' in fields) patchBody.dueAt = fields.due_at ? Date.parse(String(fields.due_at)) : undefined;
				if ('story_points' in fields) patchBody.storyPoints = fields.story_points ?? undefined;
				db.updateTicket(ticket.key, patchBody, actor);
			},
		};
	}

	return {
		async transition(ticket, to) {
			try {
				const version = await versionOf(ticket.key);
				await api.post<TicketDto>(`/orgs/${orgSlug}/tickets/${ticket.key}/transitions`, {
					json: { to: statusToWire(to), version },
				});
				invalidate(ticket.key);
				return true;
			} catch (err) {
				handleWriteError(err, 'Could not move that ticket.');
				return false;
			}
		},

		async assign(ticket, assigneeId) {
			try {
				await patch(ticket.key, { assignee_id: assigneeId ?? null });
			} catch (err) {
				handleWriteError(err, 'Could not change the assignee.');
			}
		},

		async setPriority(ticket, priority) {
			try {
				await patch(ticket.key, { priority: priorityToWire(priority) });
			} catch (err) {
				handleWriteError(err, 'Could not change the priority.');
			}
		},

		async updateTicket(ticket, patchBody) {
			try {
				await patch(ticket.key, patchBody);
			} catch (err) {
				handleWriteError(err, 'Could not save that change.');
			}
		},

		async addComment(ticket, body, internal) {
			try {
				await api.post<TicketDto>(`/orgs/${orgSlug}/tickets/${ticket.key}/comments`, {
					json: { body, internal },
					idempotencyKey: crypto.randomUUID(),
				});
				invalidate(ticket.key);
			} catch (err) {
				handleWriteError(err, 'Could not post that comment.');
			}
		},

		async setLabels(ticket, labels) {
			try {
				await patch(ticket.key, { labels });
			} catch (err) {
				handleWriteError(err, 'Could not update the labels.');
			}
		},

		async toggleWatch(ticket) {
			const watching = ticket.watcherIds.includes(actor.id);
			try {
				const path = `/orgs/${orgSlug}/tickets/${ticket.key}/watch`;
				if (watching) await api.del(path);
				else await api.put(path);
				invalidate(ticket.key);
			} catch (err) {
				handleWriteError(err, 'Could not change whether you are watching.');
			}
		},

		async logTime(ticket, minutes) {
			try {
				await api.post(`/orgs/${orgSlug}/tickets/${ticket.key}/time`, { json: { minutes } });
				invalidate(ticket.key);
			} catch (err) {
				handleWriteError(err, 'Could not log that time.');
			}
		},

		async deleteTicket(ticket) {
			try {
				const version = await versionOf(ticket.key);
				await api.del(`/orgs/${orgSlug}/tickets/${ticket.key}?version=${version}`);
				invalidate(ticket.key);
			} catch (err) {
				handleWriteError(err, 'Could not delete that ticket.');
			}
		},

		async patchFields(ticket, fields) {
			try {
				await patch(ticket.key, fields);
			} catch (err) {
				handleWriteError(err, 'Could not save that change.');
			}
		},
	};
}

export { ticketDtoToDomain };
