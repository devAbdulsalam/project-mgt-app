// Read hooks for the domains that are still mock-backed in most screens.
//
// One module rather than a folder per domain: these are thin wrappers over
// `GET /orgs/{org}/…` with no logic of their own, and splitting them would
// spread eight files' worth of imports over eight folders for no gain. Anything
// that grows real behaviour should move out into its own feature module.
//
// Every hook is gated on `isLiveApi()`, so calling one in mock mode is inert
// and a component can ask for both sources unconditionally.

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/api';
import type { Query } from '@/api';
import { isLiveApi } from '@/shared/lib/live-api';

/** The envelope every list endpoint returns. */
interface List<T> {
	data: T[];
}

function useOrgList<T>(org: string, path: string, query: Query = {}, enabled = true): UseQueryResult<T[]> {
	return useQuery({
		queryKey: ['org', org, path, query],
		queryFn: async ({ signal }) => {
			const page = await api.get<List<T>>(`/orgs/${org}${path}`, { query, signal });
			return page.data;
		},
		enabled: isLiveApi() && enabled && Boolean(org),
		staleTime: 30_000,
	});
}

function useOrgOne<T>(org: string, path: string, enabled = true): UseQueryResult<T> {
	return useQuery({
		queryKey: ['org', org, path],
		queryFn: ({ signal }) => api.get<T>(`/orgs/${org}${path}`, { signal }),
		enabled: isLiveApi() && enabled && Boolean(org),
		staleTime: 30_000,
	});
}

// -- Projects ---------------------------------------------------------------

export interface ProjectDto {
	id: string;
	key: string;
	name: string;
	description: string | null;
	kind: 'service' | 'software';
	lead_id: string | null;
	color: string | null;
	last_ticket_seq: number;
	archived: boolean;
	member_ids: string[];
	/** True only for the requesting user — starring is personal. */
	starred: boolean;
	open_count: number;
	total_count: number;
	created_at: string;
	updated_at: string;
}

export const useProjects = (org: string, includeArchived = false) =>
	useOrgList<ProjectDto>(org, '/projects', includeArchived ? { archived: true } : {});

export const useProject = (org: string, key: string | undefined) =>
	useOrgOne<ProjectDto & { summary: Record<string, number> }>(org, `/projects/${key}`, Boolean(key));

// -- Members and clients ----------------------------------------------------

export interface MemberDto {
	id: string;
	name: string;
	email: string;
	role: string;
	status: string;
	phone?: string | null;
	title?: string | null;
	last_active_at?: string | null;
	joined_at?: string;
	/** A stable URL, or null when that person has no photo. */
	avatar_url?: string | null;
}

export const useMembers = (org: string) => useOrgList<MemberDto>(org, '/members');

export interface ClientDto {
	id: string;
	name: string;
	tier: string | null;
	industry: string | null;
	created_at: string;
}

export const useClients = (org: string) => useOrgList<ClientDto>(org, '/clients');

/** A client with the figures the list page shows. Money is minor units. */
export interface ClientStatsDto extends ClientDto {
	profile: { rc?: string; city?: string; account_manager_id?: string | null; health_pct?: number; sites?: string[] };
	site_count: number;
	asset_count: number;
	open_tickets: number;
	p1_open: number;
	primary_contact: string | null;
	contract_name: string | null;
	contract_status: string | null;
	monthly_value: number | null;
	contract_ends_on: string | null;
	hours_purchased: number | null;
	hours_used: number | null;
}

export const useClientStats = (org: string) => useOrgList<ClientStatsDto>(org, '/clients/stats');

export interface ClientNoteDto {
	id: string;
	author_id: string | null;
	author_name: string | null;
	body: string;
	created_at: string;
}

export const useClientNotes = (org: string, clientId: string | undefined) =>
	useOrgList<ClientNoteDto>(org, `/clients/${clientId}/notes`, {}, Boolean(clientId));

export interface ClientOverviewDto {
	site_count: number;
	asset_count: number;
	open_tickets: number;
	total_tickets: number;
	outstanding_amount: number;
	upcoming_visits: number;
}

export const useClientOverview = (org: string, clientId: string | undefined) =>
	useOrgOne<ClientOverviewDto>(org, `/clients/${clientId}/overview`, Boolean(clientId));

export const useClientSites = (org: string, clientId: string | undefined) =>
	useOrgList<{ id: string; name: string; city: string | null; address: string | null; asset_count: number }>(
		org,
		`/clients/${clientId}/sites`,
		{},
		Boolean(clientId),
	);

export const useClientContacts = (org: string, clientId: string | undefined) =>
	useOrgList<{ id: string; site_id: string | null; name: string; email: string | null; phone: string | null; role: string | null; is_primary: boolean }>(
		org,
		`/clients/${clientId}/contacts`,
		{},
		Boolean(clientId),
	);

export interface ContractDto {
	id: string;
	name: string;
	status: string;
	tier: string | null;
	starts_on: string | null;
	ends_on: string | null;
	monthly_value: number | null;
	currency: string;
	hours_purchased: number | null;
	hours_used: number;
	terms: { overage_rate?: number; coverage?: string; sla_summary?: string; scope?: string; excluded?: string };
}

export const useClientContracts = (org: string, clientId: string | undefined) =>
	useOrgList<ContractDto>(
		org,
		`/clients/${clientId}/contracts`,
		{},
		Boolean(clientId),
	);

export const useInvoices = (org: string, clientId?: string) =>
	useOrgList<{ id: string; client_id: string; number: string; status: string; amount: number; currency: string; issued_on: string | null; due_on: string | null }>(
		org,
		'/invoices',
		clientId ? { client_id: clientId } : {},
	);

// -- Assets -----------------------------------------------------------------

export interface AssetDto {
	id: string;
	client_id: string | null;
	site_id: string | null;
	tag: string;
	name: string;
	category: string;
	status: string;
	manufacturer: string | null;
	model: string | null;
	serial_number: string | null;
	purchased_on: string | null;
	/** Calendar days, not timestamps — see the backend's DATE type parser. */
	warranty_ends: string | null;
	expires_on: string | null;
	client_name: string | null;
	site_name: string | null;
	warranty_expired: boolean;
	expired: boolean;
	/** Free-form details: user, location, firmware, agent, monitoring, wan. */
	specs?: Record<string, unknown>;
	open_ticket_key?: string | null;
}

export const useAssets = (org: string, filters: { client_id?: string; category?: string; status?: string; q?: string; limit?: number } = {}) =>
	useOrgList<AssetDto>(org, '/assets', filters as Query);

export const useExpiringAssets = (org: string, days = 90) =>
	useOrgList<{ id: string; tag: string; name: string; category: string; warranty_ends: string | null; expires_on: string | null }>(
		org,
		'/assets/expiring',
		{ days },
	);

// -- Visits -----------------------------------------------------------------

export interface VisitDto {
	id: string;
	ticket_id: string | null;
	ticket_key: string | null;
	client_id: string | null;
	client_name: string | null;
	site_id: string | null;
	site_name: string | null;
	site_city: string | null;
	engineer_id: string | null;
	engineer_name: string | null;
	status: string;
	scheduled_for: string | null;
	window_end: string | null;
	dispatched_at?: string | null;
	arrived_at?: string | null;
	completed_at?: string | null;
	summary: string | null;
	checkpoints?: { label: string; at?: number; done: boolean }[];
	parts?: { name: string; amount: number; approval: 'covered' | 'needs approval' | 'approved' }[];
	ticket_priority?: string | null;
	site_address?: string | null;
	site_region?: string | null;
	travel_min: number | null;
	labour_min: number | null;
}

export const useVisits = (org: string, filters: { engineer?: string; client_id?: string; status?: string; from?: string; to?: string } = {}) =>
	useOrgList<VisitDto>(org, '/visits', filters as Query);

// -- Knowledge base ---------------------------------------------------------

export interface ArticleDto {
	id: string;
	slug: string;
	title: string;
	excerpt: string | null;
	category: string | null;
	tags: string[];
	status: string;
	visibility: string;
	author_id: string | null;
	published_at: string | null;
	views: number;
	helpful: number;
	not_helpful: number;
	updated_at: string;
}

export const useArticles = (org: string, filters: { q?: string; category?: string; status?: string; limit?: number } = {}) =>
	useOrgList<ArticleDto>(org, '/kb', filters as Query);

export const useArticle = (org: string, slug: string | undefined) =>
	useOrgOne<ArticleDto & { body: string }>(org, `/kb/${slug}`, Boolean(slug));

// -- Project management -----------------------------------------------------

export interface EpicDto {
	id: string;
	project_id: string;
	key: string;
	name: string;
	summary: string | null;
	status: string;
	ticket_count: number;
	done_count: number;
	points_total: number;
	points_done: number;
}

export const useEpics = (org: string, projectKey?: string) =>
	useOrgList<EpicDto>(org, '/epics', projectKey ? { project: projectKey } : {});

export interface SprintDto {
	id: string;
	project_id: string;
	name: string;
	goal: string | null;
	state: 'planned' | 'active' | 'completed';
	starts_at: string | null;
	ends_at: string | null;
	ticket_count: number;
	done_count: number;
	points_total: number;
	points_done: number;
}

export const useSprints = (org: string, projectKey?: string, state?: string) =>
	useOrgList<SprintDto>(org, '/sprints', { ...(projectKey ? { project: projectKey } : {}), ...(state ? { state } : {}) });

export interface BoardCardDto {
	id: string;
	key: string;
	title: string;
	status: string;
	priority: string;
	type: string;
	assignee_id: string | null;
	assignee_name: string | null;
	story_points: number | null;
	rank: number;
	labels: string[];
}

export interface BoardDto {
	id: string;
	project_id: string;
	name: string;
	kind: string;
	columns: {
		id: string;
		name: string;
		statuses: string[];
		position: number;
		wip_limit: number | null;
		over_wip: boolean;
		cards: BoardCardDto[];
	}[];
}

export const useBoards = (org: string, projectKey?: string) =>
	useOrgList<{ id: string; project_id: string; name: string; kind: string }>(
		org,
		'/boards',
		projectKey ? { project: projectKey } : {},
	);

export const useBoard = (org: string, boardId: string | undefined) =>
	useOrgOne<BoardDto>(org, `/boards/${boardId}`, Boolean(boardId));

export const useBacklog = (org: string, projectKey: string | undefined) =>
	useOrgList<{ id: string; key: string; title: string; status: string; priority: string; type: string; story_points: number | null; rank: number; epic_id: string | null }>(
		org,
		'/backlog',
		{ project: projectKey ?? '' },
		Boolean(projectKey),
	);

// -- Dashboard --------------------------------------------------------------

export interface DashboardDto {
	summary: {
		open: number;
		mine: number;
		unassigned: number;
		p1_open: number;
		resolved_7d: number;
		created_7d: number;
		sla_breached: number;
	};
	by_status: { status: string; count: number }[];
	by_channel: { channel: string; count: number }[];
	workload: { user_id: string; name: string; open_count: number; points: number }[];
}

export const useDashboard = (org: string) => useOrgOne<DashboardDto>(org, '/dashboard');
