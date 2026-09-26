// Ticket mutations — all repeat-safe (Idempotency-Key) and version-checked.
// Factories take the QueryClient so onSuccess invalidates the minimal keys
// (frontend plan §8.1): list + counts + the detail that just changed.

import { mutationOptions, type QueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import type { Status, Ticket } from '@/mocks/types';
import type { CreateTicketInput } from '@/mocks/db';
import type { CommentPayload, TicketDto, TransitionPayload, UpdateTicketPayload } from './contracts';
import { createTicketToPayload, statusToWire, ticketDtoToDomain } from './mapper';
import { ticketKeys } from './queryKeys';

interface TicketScope {
	org: string;
}

export function createTicketMutation(queryClient: QueryClient, scope: TicketScope, projectKey: string) {
	return mutationOptions({
		mutationKey: ['tickets', 'create', { org: scope.org, projectKey }],
		mutationFn: async (input: CreateTicketInput) => {
			const dto = await api.post<TicketDto>(`/orgs/${scope.org}/projects/${projectKey}/tickets`, {
				json: createTicketToPayload(input),
				idempotencyKey: crypto.randomUUID(),
			});
			return ticketDtoToDomain(dto);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ticketKeys.all });
		},
	});
}

export interface UpdateTicketInput {
	key: string;
	/** Current version (optimistic lock); the server rejects stale writes with 409. */
	version: number;
	patch: Omit<UpdateTicketPayload, 'version'>;
}

export function updateTicketMutation(queryClient: QueryClient, scope: TicketScope) {
	return mutationOptions({
		mutationKey: ['tickets', 'update', { org: scope.org }],
		mutationFn: async ({ key, version, patch }: UpdateTicketInput) => {
			const dto = await api.patch<TicketDto>(`/orgs/${scope.org}/tickets/${key}`, {
				json: { ...patch, version } satisfies UpdateTicketPayload,
				idempotencyKey: crypto.randomUUID(),
			});
			return ticketDtoToDomain(dto);
		},
		onSuccess: (ticket) => {
			queryClient.invalidateQueries({ queryKey: ticketKeys.lists });
			queryClient.setQueryData(ticketKeys.detail(ticket.key), ticket);
		},
	});
}

export interface TransitionInput {
	key: string;
	to: Status;
	version: number;
	comment?: string;
}

export function transitionMutation(queryClient: QueryClient, scope: TicketScope) {
	return mutationOptions({
		mutationKey: ['tickets', 'transition', { org: scope.org }],
		mutationFn: async ({ key, to, version, comment }: TransitionInput) => {
			// The UI works in display labels ('In progress'); the API stores values.
			const payload: TransitionPayload = { to: statusToWire(to), version, comment };
			const dto = await api.post<TicketDto>(`/orgs/${scope.org}/tickets/${key}/transitions`, {
				json: payload,
				idempotencyKey: crypto.randomUUID(),
			});
			return ticketDtoToDomain(dto);
		},
		onSuccess: (ticket) => {
			queryClient.invalidateQueries({ queryKey: ticketKeys.all });
			queryClient.setQueryData(ticketKeys.detail(ticket.key), ticket);
		},
	});
}

export interface AddCommentInput {
	key: string;
	comment: CommentPayload;
}

export function addCommentMutation(queryClient: QueryClient, scope: TicketScope) {
	return mutationOptions({
		mutationKey: ['tickets', 'comment', { org: scope.org }],
		mutationFn: async ({ key, comment }: AddCommentInput) => {
			const dto = await api.post<TicketDto>(`/orgs/${scope.org}/tickets/${key}/comments`, {
				json: comment,
				idempotencyKey: crypto.randomUUID(),
			});
			return ticketDtoToDomain(dto);
		},
		onSuccess: (ticket: Ticket) => {
			queryClient.setQueryData(ticketKeys.detail(ticket.key), ticket);
			queryClient.invalidateQueries({ queryKey: ticketKeys.lists });
		},
	});
}

export function deleteTicketMutation(queryClient: QueryClient, scope: TicketScope) {
	return mutationOptions({
		mutationKey: ['tickets', 'delete', { org: scope.org }],
		mutationFn: async (key: string) => {
			await api.del<void>(`/orgs/${scope.org}/tickets/${key}`, { idempotencyKey: crypto.randomUUID() });
		},
		onSuccess: (_data, key) => {
			queryClient.removeQueries({ queryKey: ticketKeys.detail(key) });
			queryClient.invalidateQueries({ queryKey: ticketKeys.all });
		},
	});
}