// Clients, from whichever source is active.
//
// The mock `ClientAccount` is one fat object carrying sites, contacts, invoices,
// the contract and notes. The API keeps those as separate resources, which is
// the right shape for a database but not for the page. This assembles the fat
// object from the several calls so the components stay unchanged.

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useDb } from '@/mocks/db';
import { statusCategory } from '@/mocks/seed';
import { isLiveApi } from '@/shared/lib/live-api';
import { toast } from '@/shared/lib/toast-store';
import type { ClientAccount, ClientContact, ClientNote, ClientSite, Contract, Invoice, PlanTier, Tint, Ticket } from '@/mocks/types';
import {
	useClientContacts,
	useClientContracts,
	useClientNotes,
	useClientSites,
	useClientStats,
	useInvoices,
	type ClientStatsDto,
	type ContractDto,
} from '@/api/resources';
import type { TicketPage } from '@/features/tickets/api/contracts';
import { ticketDtoToDomain } from '@/features/tickets/api/mapper';

/** The API stores a tier; the UI shows a plan name. */
const PLAN_LABEL: Record<string, PlanTier> = {
	gold: 'Gold',
	platinum: 'Gold',
	silver: 'Silver',
	bronze: 'Bronze',
};

/** And back. `Trial` is the absence of a tier, not a tier. */
const PLAN_TIER: Record<PlanTier, string | null> = { Gold: 'gold', Silver: 'silver', Bronze: 'bronze', Trial: null };

const TINTS: Tint[] = ['teal', 'tan', 'green', 'lavender', 'grey'];

/** Stable per client, so a card does not change colour between renders. */
function tintFor(id: string): Tint {
	let hash = 0;
	for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	return TINTS[hash % TINTS.length];
}

const initialsOf = (name: string) =>
	name
		.split(/\s+/)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? '')
		.join('');

/** Minor units to whole currency, for display; and back for saving. */
const fromMinor = (amount: number | null | undefined) => (amount ?? 0) / 100;
const toMinor = (amount: number) => Math.round(amount * 100);

/** A calendar day (`YYYY-MM-DD`) as a UTC timestamp, so it cannot shift a day. */
const dayMs = (day: string | null | undefined) => (day ? Date.parse(`${day}T00:00:00Z`) : 0);

const EMPTY_CONTRACT: Contract = {
	plan: '—',
	termStart: 0,
	termEnd: 0,
	feeMonthly: 0,
	hoursIncluded: 0,
	overageRate: 0,
	coverage: '',
	slaSummary: '',
	scope: '',
	excluded: '',
	documents: [],
};

/**
 * The city a client is in. The API keeps it in the profile; seeded clients only
 * have their site list ("Abuja · Wuse 2"), whose first word is the city.
 */
const cityOf = (dto: ClientStatsDto) => dto.profile?.city ?? dto.profile?.sites?.[0]?.split(' · ')[0] ?? '';

/** The list view: enough for a card, without fetching each client's detail. */
function toSummary(dto: ClientStatsDto): ClientAccount {
	const plan = PLAN_LABEL[dto.tier ?? ''] ?? 'Trial';

	return {
		id: dto.id,
		name: dto.name,
		initials: initialsOf(dto.name),
		rc: dto.profile?.rc ?? '',
		industry: dto.industry ?? '',
		city: cityOf(dto),
		plan,
		status: plan === 'Trial' ? 'Trial' : 'Active',
		healthPct: dto.profile?.health_pct,
		siteList: [],
		// Just the primary contact's name, which is all the list shows.
		contacts: dto.primary_contact
			? [{ id: 'primary', name: dto.primary_contact, role: 'Primary contact', primary: true, channel: 'email' }]
			: [],
		assetsCount: dto.asset_count,
		hoursUsed: dto.hours_used ?? 0,
		hoursIncluded: dto.hours_purchased ?? 0,
		mrr: fromMinor(dto.monthly_value),
		renewalAt: dayMs(dto.contract_ends_on),
		since: Date.parse(dto.created_at),
		accountManagerId: dto.profile?.account_manager_id ?? '',
		invoices: [],
		notes: [],
		contract: EMPTY_CONTRACT,
		tint: tintFor(dto.id),
	};
}

/** Counts the list page shows next to each client. */
export interface ClientFigures {
	sites: number;
	open: number;
	p1: number;
}

export function useClientList(orgSlug: string) {
	const live = isLiveApi();
	const mock = useDb((s) => s.clientAccounts);
	const tickets = useDb((s) => s.tickets);
	const query = useClientStats(orgSlug);

	const clients = useMemo(() => (query.data ?? []).map(toSummary), [query.data]);

	const figures = useMemo(() => {
		const map = new Map<string, ClientFigures>();
		if (live) {
			for (const dto of query.data ?? []) map.set(dto.id, { sites: dto.site_count, open: dto.open_tickets, p1: dto.p1_open });
		} else {
			for (const c of mock) {
				const open = tickets.filter((t) => t.clientId === c.id && statusCategory[t.status] !== 'done');
				map.set(c.id, { sites: c.siteList.length, open: open.length, p1: open.filter((t) => t.priority === 'P1').length });
			}
		}
		return (id: string): ClientFigures => map.get(id) ?? { sites: 0, open: 0, p1: 0 };
	}, [live, query.data, mock, tickets]);

	if (!live) return { clients: mock, figures, loading: false, error: null, refetch: () => {} };
	return { clients, figures, loading: query.isPending, error: query.error, refetch: () => void query.refetch() };
}

/** Every ticket for one client, newest activity first. */
function useClientTickets(orgSlug: string, clientId: string | undefined) {
	const live = isLiveApi();
	const mock = useDb((s) => s.tickets);

	const query = useQuery({
		queryKey: ['org', orgSlug, 'client-tickets', clientId],
		queryFn: async ({ signal }): Promise<Ticket[]> => {
			const page = await api.get<TicketPage>(`/orgs/${orgSlug}/tickets`, {
				query: { client_id: clientId, sort: 'updated', limit: 100 },
				signal,
			});
			return page.data.map(ticketDtoToDomain);
		},
		enabled: live && Boolean(clientId),
		staleTime: 15_000,
	});

	const tickets = useMemo(
		() => (live ? (query.data ?? []) : mock.filter((t) => t.clientId === clientId)).slice().sort((a, b) => b.updatedAt - a.updatedAt),
		[live, query.data, mock, clientId],
	);

	return { tickets, query };
}

/** The contract the page treats as current: an active one, else the newest. */
const currentContract = (contracts: ContractDto[]) => contracts.find((c) => c.status === 'active') ?? contracts[0];

/**
 * One client, with everything the detail page shows.
 *
 * Several requests rather than one: the API models these as separate resources,
 * and a bespoke "everything about a client" endpoint would be a second shape to
 * keep correct. They run in parallel and the page renders as they land.
 */
export function useClientDetail(orgSlug: string, clientId: string | undefined) {
	const live = isLiveApi();
	const mock = useDb((s) => s.clientAccounts.find((c) => c.id === clientId));

	const list = useClientStats(orgSlug);
	const sites = useClientSites(orgSlug, clientId);
	const contacts = useClientContacts(orgSlug, clientId);
	const contracts = useClientContracts(orgSlug, clientId);
	const invoices = useInvoices(orgSlug, clientId);
	const notes = useClientNotes(orgSlug, clientId);
	const { tickets, query: ticketQuery } = useClientTickets(orgSlug, clientId);

	const contractDto = useMemo(() => currentContract(contracts.data ?? []), [contracts.data]);

	const client = useMemo<ClientAccount | undefined>(() => {
		if (!live) return mock;

		const base = (list.data ?? []).find((c) => c.id === clientId);
		if (!base) return undefined;

		const contract = contractDto;
		const terms = contract?.terms ?? {};
		const contactList = contacts.data ?? [];

		return {
			...toSummary(base),
			hoursUsed: contract?.hours_used ?? 0,
			hoursIncluded: contract?.hours_purchased ?? 0,
			mrr: fromMinor(contract?.monthly_value),
			renewalAt: dayMs(contract?.ends_on),

			siteList: (sites.data ?? []).map<ClientSite>((s) => ({
				id: s.id,
				name: s.name,
				address: s.address ?? s.city ?? '',
				// A site contact is a contact pinned to that site.
				contactName: contactList.find((k) => k.site_id === s.id)?.name ?? '',
				assets: s.asset_count,
				// A ticket names its site in words, not by id.
				open: tickets.filter((t) => t.site === s.name && statusCategory[t.status] !== 'done').length,
			})),

			contacts: contactList.map<ClientContact>((c) => ({
				id: c.id,
				name: c.name,
				role: c.role ?? '',
				primary: c.is_primary,
				// The API does not record a preferred channel; infer the one we
				// actually have a way to reach them on.
				channel: c.phone ? 'phone' : 'email',
				phone: c.phone ?? undefined,
				email: c.email ?? undefined,
			})),

			invoices: (invoices.data ?? []).map<Invoice>((i) => ({
				id: i.id,
				number: i.number,
				label: i.number,
				amount: fromMinor(i.amount),
				status:
					i.status === 'paid'
						? 'Paid'
						: i.status === 'overdue'
							? 'Overdue'
							: i.status === 'sent'
								? 'Due'
								: 'Draft',
				issuedAt: dayMs(i.issued_on),
				dueAt: dayMs(i.due_on),
			})),

			contract: contract
				? {
						plan: contract.name,
						termStart: dayMs(contract.starts_on),
						termEnd: dayMs(contract.ends_on),
						feeMonthly: fromMinor(contract.monthly_value),
						hoursIncluded: contract.hours_purchased ?? 0,
						overageRate: fromMinor(terms.overage_rate),
						coverage: terms.coverage ?? '',
						slaSummary: terms.sla_summary ?? '',
						scope: terms.scope ?? '',
						excluded: terms.excluded ?? '',
						// Files are not modelled server-side yet.
						documents: [],
					}
				: EMPTY_CONTRACT,

			notes: (notes.data ?? []).map<ClientNote>((n) => ({
				id: n.id,
				authorName: n.author_name ?? 'Someone',
				body: n.body,
				at: Date.parse(n.created_at),
			})),
		};
	}, [live, mock, list.data, clientId, contractDto, sites.data, contacts.data, invoices.data, notes.data, tickets]);

	// The client itself failing is fatal to the page; a section failing is not,
	// but must not read as "nothing there".
	const sectionError = [sites, contacts, contracts, invoices, notes, ticketQuery].find((q) => q.error)?.error ?? null;

	return {
		client,
		tickets,
		contractId: contractDto?.id,
		loading: live && list.isPending,
		error: live ? list.error : null,
		sectionError: live ? sectionError : null,
		refetch: () => {
			void list.refetch();
			void sites.refetch();
			void contacts.refetch();
			void contracts.refetch();
			void invoices.refetch();
			void notes.refetch();
			void ticketQuery.refetch();
		},
	};
}

// -- Writes -----------------------------------------------------------------

export interface NewClientInput {
	name: string;
	rc: string;
	industry: string;
	city: string;
	plan: PlanTier;
	contactName: string;
	contactPhone?: string;
	accountManagerId: string;
}

export function useClientActions(orgSlug: string) {
	const live = isLiveApi();
	const db = useDb();
	const queryClient = useQueryClient();

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ['org', orgSlug] });

	const report = (err: unknown, fallback: string) =>
		toast(err instanceof ApiError ? err.message : fallback, { tone: 'danger' });

	return {
		/** Resolves to the new client, or undefined after telling the person why not. */
		async addClient(input: NewClientInput): Promise<{ id: string; name: string; plan: PlanTier } | undefined> {
			if (!live) {
				const c = db.addClient(input);
				return { id: c.id, name: c.name, plan: c.plan };
			}
			try {
				const created = await api.post<{ id: string }>(`/orgs/${orgSlug}/clients`, {
					json: { name: input.name, industry: input.industry, ...(PLAN_TIER[input.plan] ? { tier: PLAN_TIER[input.plan] } : {}) },
					idempotencyKey: crypto.randomUUID(),
				});

				// The API's client is thin; the rest of what the form collected
				// lives in its profile, and the person to call is a contact.
				await api.patch(`/orgs/${orgSlug}/clients/${created.id}`, {
					json: { profile: { rc: input.rc, city: input.city, account_manager_id: input.accountManagerId || null } },
				});
				try {
					await api.post(`/orgs/${orgSlug}/clients/${created.id}/contacts`, {
						json: { name: input.contactName, phone: input.contactPhone || undefined, role: 'Primary contact', is_primary: true },
					});
				} catch (err) {
					// The client exists; do not pretend the whole thing failed.
					report(err, 'The client was added, but its primary contact was not.');
				}

				await invalidate();
				return { id: created.id, name: input.name, plan: input.plan };
			} catch (err) {
				report(err, 'Could not add that client.');
				return undefined;
			}
		},

		async addSite(clientId: string, input: { name: string; address: string; contactName: string }): Promise<boolean> {
			if (!live) {
				db.addSite(clientId, input);
				return true;
			}
			try {
				const site = await api.post<{ id: string }>(`/orgs/${orgSlug}/clients/${clientId}/sites`, {
					json: { name: input.name, address: input.address },
				});
				if (input.contactName) {
					await api.post(`/orgs/${orgSlug}/clients/${clientId}/contacts`, {
						json: { name: input.contactName, role: 'Site contact', site_id: site.id },
					});
				}
				await invalidate();
				return true;
			} catch (err) {
				report(err, 'Could not add that site.');
				return false;
			}
		},

		async addContact(
			clientId: string,
			input: { name: string; role: string; channel: ClientContact['channel']; phone?: string; email?: string },
		): Promise<boolean> {
			if (!live) {
				db.addContact(clientId, { name: input.name, role: input.role, channel: input.channel, phone: input.phone, email: input.email, primary: false });
				return true;
			}
			try {
				await api.post(`/orgs/${orgSlug}/clients/${clientId}/contacts`, {
					// The API has no preferred channel; what it records is how to reach them.
					json: { name: input.name, role: input.role, phone: input.phone || undefined, email: input.email || undefined },
				});
				await invalidate();
				return true;
			} catch (err) {
				report(err, 'Could not add that contact.');
				return false;
			}
		},

		async addNote(clientId: string, body: string, actor: { id: string; name: string }): Promise<boolean> {
			if (!live) {
				db.addClientNote(clientId, body, actor);
				return true;
			}
			try {
				await api.post(`/orgs/${orgSlug}/clients/${clientId}/notes`, { json: { body: body.trim() } });
				await invalidate();
				return true;
			} catch (err) {
				report(err, 'Could not add that note.');
				return false;
			}
		},

		/** Edits the current contract, or creates the first one. */
		async saveContract(client: ClientAccount, contractId: string | undefined, next: Contract): Promise<boolean> {
			if (!live) {
				db.updateClient(client.id, { contract: next });
				return true;
			}

			const terms = {
				overage_rate: toMinor(next.overageRate),
				coverage: next.coverage,
				sla_summary: next.slaSummary,
				scope: next.scope,
				excluded: next.excluded,
			};

			try {
				if (contractId) {
					await api.patch(`/orgs/${orgSlug}/clients/${client.id}/contracts/${contractId}`, {
						json: {
							name: next.plan.trim() || client.plan,
							monthly_value: toMinor(next.feeMonthly),
							hours_purchased: next.hoursIncluded,
							terms,
						},
					});
				} else {
					const today = new Date();
					const end = new Date(today);
					end.setUTCFullYear(end.getUTCFullYear() + 1);
					await api.post(`/orgs/${orgSlug}/clients/${client.id}/contracts`, {
						json: {
							name: next.plan.trim() && next.plan !== '—' ? next.plan.trim() : client.plan,
							tier: PLAN_TIER[client.plan] ?? undefined,
							starts_on: today.toISOString().slice(0, 10),
							ends_on: end.toISOString().slice(0, 10),
							monthly_value: toMinor(next.feeMonthly),
							hours_purchased: next.hoursIncluded,
							terms,
						},
					});
				}
				await invalidate();
				return true;
			} catch (err) {
				report(err, 'Could not save that contract.');
				return false;
			}
		},

		async setInvoiceStatus(
			clientId: string,
			invoiceId: string,
			status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void',
		): Promise<boolean> {
			if (!live) {
				// The mock keys invoices under their client; the API addresses them
				// directly, and its status values are the stored ones.
				const label = { paid: 'Paid', overdue: 'Overdue', sent: 'Due', draft: 'Draft', void: 'Draft' } as const;
				db.setInvoiceStatus(clientId, invoiceId, label[status]);
				return true;
			}
			try {
				await api.post(`/orgs/${orgSlug}/invoices/${invoiceId}/status`, { json: { status } });
				await invalidate();
				return true;
			} catch (err) {
				report(err, 'Could not change that invoice.');
				return false;
			}
		},
	};
}

export function useAddClientMutation(orgSlug: string) {
	const actions = useClientActions(orgSlug);
	return useMutation({ mutationFn: actions.addClient });
}
