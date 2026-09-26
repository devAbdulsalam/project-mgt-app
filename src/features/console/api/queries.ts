// Query factories for the operator console.
//
// All of these require a live elevation except `operatorQuery` — which is
// standing-only, and is the call that decides whether the console opens at all.
// The elevation-expiry is handled by a refetch interval on that one query
// (see below) rather than by short staleTimes everywhere.

import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { superAdminApi } from './client';
import { auditKeys, operatorKeys, operatorListKeys, orgKeys, userKeys } from './keys';
import { toAuditEntry, toOperator, toOperatorRow, toOrg, toOrgDetail, toUser, toUserDetail } from './mapper';
import { offsetOf, type AdminOrg, type AdminOrgDetail, type AdminUser, type AdminUserDetail, type AuditEntry, type AuditSearch, type Operator, type OrgsSearch, type UsersSearch } from '../model';
import type { OffsetPage } from '../model';

/**
 * Who this operator is, and how much is left of their elevation.
 *
 * Refetched every 30 seconds for one reason: the server's elevation is a
 * timestamp, and a client that trusts its own copy will happily render an
 * operator's console for a few seconds after the window closed. Polling the
 * cheap standing-only endpoint is cheaper and far more honest than assuming the
 * client is right. The 403s that a stale client would otherwise get are exactly
 * the kind of thing that makes people reflexively retry.
 *
 * `refetchOnWindowFocus` is on, so coming back to a tab re-checks immediately
 * rather than waiting out the interval.
 */
export function operatorQuery() {
	return queryOptions({
		queryKey: operatorKeys.me(),
		queryFn: async ({ signal }): Promise<Operator> => toOperator(await superAdminApi.me(signal)),
		refetchInterval: 30_000,
		refetchOnWindowFocus: true,
		// Standing is read from the database on every request and is never
		// carried in the access token, precisely so that revoking an operator
		// takes effect now. Caching it for minutes here would undo that on the
		// client side, so the floor is one second.
		staleTime: 1_000,
	});
}

export function usersQuery(search: UsersSearch) {
	const limit = search.limit;
	const offset = offsetOf(search.page, limit);
	const term = search.q || undefined;
	return queryOptions({
		queryKey: userKeys.list(term, limit, offset),
		queryFn: async ({ signal }): Promise<OffsetPage<AdminUser>> => {
			const page = await superAdminApi.users(term, limit, offset, signal);
			return { items: page.data.map(toUser), total: page.total, limit: page.limit, offset: page.offset };
		},
		// Typing in the search box should not blank the table between keystrokes.
		placeholderData: keepPreviousData,
		staleTime: 15_000,
	});
}

export function userQuery(userId: string) {
	return queryOptions({
		queryKey: userKeys.detail(userId),
		queryFn: async ({ signal }): Promise<AdminUserDetail> => toUserDetail(await superAdminApi.user(userId, signal)),
		staleTime: 15_000,
	});
}

export function orgsQuery(search: OrgsSearch) {
	const limit = search.limit;
	const offset = offsetOf(search.page, limit);
	const term = search.q || undefined;
	return queryOptions({
		queryKey: orgKeys.list(term, limit, offset),
		queryFn: async ({ signal }): Promise<OffsetPage<AdminOrg>> => {
			const page = await superAdminApi.orgs(term, limit, offset, signal);
			return { items: page.data.map(toOrg), total: page.total, limit: page.limit, offset: page.offset };
		},
		placeholderData: keepPreviousData,
		staleTime: 15_000,
	});
}

export function orgQuery(slug: string) {
	return queryOptions({
		queryKey: orgKeys.detail(slug),
		queryFn: async ({ signal }): Promise<AdminOrgDetail> => toOrgDetail(await superAdminApi.org(slug, signal)),
		staleTime: 15_000,
	});
}

export function operatorsQuery() {
	return queryOptions({
		queryKey: operatorListKeys.all,
		queryFn: async ({ signal }): Promise<Operator[]> => (await superAdminApi.operators(signal)).data.map(toOperatorRow),
		// The operator list is the page whose staleness would be a real problem:
		// it is who currently holds the keys to the platform.
		staleTime: 10_000,
	});
}

export function auditQuery(search: AuditSearch) {
	const params = { action: search.action || undefined, targetId: search.targetId || undefined, limit: search.limit };
	return queryOptions({
		queryKey: auditKeys.list(params),
		queryFn: async ({ signal }): Promise<AuditEntry[]> => (await superAdminApi.audit(params, signal)).data.map(toAuditEntry),
		// A trail is append-only, so what is on screen only ever needs to grow.
		staleTime: 10_000,
	});
}
