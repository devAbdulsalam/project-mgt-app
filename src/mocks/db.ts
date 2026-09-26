import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { clients, epics, nextKeyNumbers, projects as seedProjects, team as seedTeam, tickets as seedTickets, notifications as seedNotifications, transitions, statusCategory, slaPausedStatuses } from './seed';
import type { Activity, Client, Comment, Epic, MemberRole, Project, Status, Subtask, TeamMember, Ticket, TicketLink, Notification, NotificationPrefs, Tint, ClientAccount, Asset, Visit, KbArticle, OrgSettings, ClientSite, ClientContact, ClientNote, SlaPolicy, AutomationRule, ApiKey, Webhook, VisitStatus, Invoice, Program, ProgramActivity, ProgramParticipant, Expense, ActivityStatus, ParticipantKind, ParticipantStatus, ExpenseStatus } from './types';
import { isLiveApi } from '@/shared/lib/live-api';
import { useMemberDirectory } from '@/shared/lib/member-directory';
import { assets as seedAssets, clientAccounts as seedClientAccounts, defaultSettings, kbArticles as seedKb, visits as seedVisits } from './seed-ops';
import { seedActivities, seedExpenses, seedParticipants, seedPrograms } from './seed-programs';

export { clients, epics, transitions, statusCategory, slaPausedStatuses };
/** Static seed roster; prefer `useDb((s) => s.members)` for live data. */
export const team = seedTeam;

const SEED_VERSION = 5;

export interface CreateTicketInput {
	projectKey: string;
	title: string;
	type: Ticket['type'];
	priority: Ticket['priority'];
	channel?: Ticket['channel'];
	clientId?: string;
	site?: string;
	assigneeId?: string;
	reporterName?: string;
	reporterIsClient?: boolean;
	labels?: string[];
	description?: string;
	dueAt?: number;
	sprint?: string;
	epicId?: string;
	asset?: string;
	impact?: Ticket['impact'];
	storyPoints?: number;
	category?: string;
	attachments?: Ticket['attachments'];
	/**
	 * Ids of files already uploaded to the API but not yet owned by anything.
	 * Only the live path uses them; the mock store keeps the attachments above.
	 */
	attachmentIds?: string[];
}

export interface CreateProjectInput {
	name: string;
	key: string;
	kind: Project['kind'];
	leadId: string;
	description: string;
}

interface Actor {
	id: string;
	name: string;
}

export interface InviteInput {
	name: string;
	email: string;
	role: MemberRole;
	base: string;
	team: string;
}

interface DbState {
	tickets: Ticket[];
	projects: Project[];
	members: TeamMember[];
	notifications: Notification[];
	prefs: NotificationPrefs;
	nextKey: Record<string, number>;
	clientAccounts: ClientAccount[];
	assets: Asset[];
	visits: Visit[];
	kb: KbArticle[];
	programs: Program[];
	activities: ProgramActivity[];
	participants: ProgramParticipant[];
	expenses: Expense[];
	settings: OrgSettings;

	createTicket: (input: CreateTicketInput, actor: Actor) => Ticket;
	updateTicket: (key: string, patch: Partial<Ticket>, actor: Actor, activityText?: string) => void;
	transition: (key: string, to: Status, actor: Actor) => boolean;
	assign: (key: string, assigneeId: string | undefined, actor: Actor) => void;
	setPriority: (key: string, priority: Ticket['priority'], actor: Actor) => void;
	addComment: (key: string, input: { body: string; internal: boolean; channel?: Comment['channel'] }, actor: Actor) => void;
	toggleSubtask: (key: string, subKey: string, actor: Actor) => void;
	addSubtask: (key: string, title: string, actor: Actor) => void;
	addLabel: (key: string, label: string, actor: Actor) => void;
	removeLabel: (key: string, label: string, actor: Actor) => void;
	logTime: (key: string, minutes: number, actor: Actor) => void;
	toggleWatch: (key: string, userId: string) => void;
	addLink: (key: string, link: TicketLink, actor: Actor) => void;
	removeLink: (key: string, link: TicketLink, actor: Actor) => void;
	deleteTicket: (key: string) => void;
	bulkUpdate: (keys: string[], patch: { status?: Status; assigneeId?: string | null; priority?: Ticket['priority'] }, actor: Actor) => number;

	createProject: (input: CreateProjectInput, actor: Actor) => Project;
	toggleStar: (projectId: string) => void;
	archiveProject: (projectId: string, archived: boolean) => void;
	updateProject: (projectId: string, patch: Partial<Project>) => void;
	/** Removes the project and every ticket in it. */
	deleteProject: (projectId: string) => void;

	inviteMember: (input: InviteInput) => TeamMember;
	updateMember: (id: string, patch: Partial<TeamMember>) => void;
	setMemberStatus: (id: string, status: TeamMember['status']) => void;
	resendInvite: (id: string) => void;

	markRead: (id: string, read?: boolean) => void;
	markAllRead: () => void;
	snooze: (id: string, minutes: number) => void;
	approveNotification: (id: string) => void;
	setPrefs: (patch: Partial<NotificationPrefs>) => void;

	// clients
	addClient: (input: Pick<ClientAccount, 'name' | 'industry' | 'city' | 'plan' | 'rc'> & { contactName: string; contactPhone?: string; accountManagerId: string }) => ClientAccount;
	updateClient: (id: string, patch: Partial<ClientAccount>) => void;
	addSite: (clientId: string, site: Omit<ClientSite, 'id' | 'assets' | 'open'>) => void;
	addContact: (clientId: string, contact: Omit<ClientContact, 'id'>) => void;
	addClientNote: (clientId: string, body: string, actor: Actor) => void;
	setInvoiceStatus: (clientId: string, invoiceId: string, status: Invoice['status']) => void;
	// assets
	addAsset: (input: Omit<Asset, 'history'>) => void;
	updateAsset: (tag: string, patch: Partial<Asset>, note?: string) => void;
	deleteAsset: (tag: string) => void;
	// visits
	scheduleVisit: (id: string, engineerId: string, startAt: number) => void;
	unscheduleVisit: (id: string) => void;
	advanceVisit: (id: string) => void;
	createVisit: (input: Pick<Visit, 'ticketKey' | 'title' | 'clientId' | 'site' | 'address' | 'priority' | 'durationMin' | 'region'> & { engineerId?: string; startAt?: number }) => Visit;
	approvePart: (visitId: string, partName: string) => void;
	// knowledge base
	createArticle: (input: Pick<KbArticle, 'title' | 'category' | 'summary' | 'body' | 'visibility' | 'tags'> & { status?: KbArticle['status'] }, actor: Actor) => KbArticle;
	updateArticle: (id: string, patch: Partial<KbArticle>) => void;
	deleteArticle: (id: string) => void;
	voteArticle: (id: string, helpful: boolean) => void;
	viewArticle: (id: string) => void;
	// programmes, training and events
	createProgram: (input: Pick<Program, 'key' | 'name' | 'description' | 'currency'> & { budgetAmount?: number; startsOn?: string; endsOn?: string; leadId?: string; clientId?: string }, actor: Actor) => Program;
	updateProgram: (key: string, patch: Partial<Program>) => void;
	archiveProgram: (key: string, archived: boolean) => void;
	deleteProgram: (key: string) => void;
	createActivity: (programKey: string, input: Pick<ProgramActivity, 'kind' | 'title' | 'description'> & { startsAt?: number; endsAt?: number; location?: string; capacity?: number; facilitatorId?: string; budgetAmount?: number }) => ProgramActivity;
	updateActivity: (key: string, patch: Partial<ProgramActivity>) => void;
	transitionActivity: (key: string, to: ActivityStatus) => boolean;
	deleteActivity: (key: string) => void;
	addParticipant: (activityId: string, input: { name: string; email?: string; kind: ParticipantKind; userId?: string; clientContactId?: string; notes?: string }) => void;
	setParticipantStatus: (id: string, status: ParticipantStatus) => void;
	removeParticipant: (id: string) => void;
	// expenses
	createExpense: (input: Pick<Expense, 'category' | 'description' | 'amount' | 'incurredOn'> & { programKey?: string; activityKey?: string; submit?: boolean; notes?: string }, actor: Actor) => Expense;
	updateExpense: (id: string, patch: Partial<Expense>) => void;
	setExpenseStatus: (id: string, status: ExpenseStatus, rejectionReason?: string) => void;
	deleteExpense: (id: string) => void;
	// settings
	updateSettings: <K extends keyof OrgSettings>(section: K, patch: Partial<OrgSettings[K]>) => void;
	setSettings: <K extends keyof OrgSettings>(section: K, value: OrgSettings[K]) => void;
	updateSlaPolicy: (id: string, patch: Partial<SlaPolicy>) => void;
	updateSlaRow: (policyId: string, index: number, patch: Partial<SlaPolicy['rows'][number]>) => void;
	upsertAutomation: (rule: AutomationRule) => void;
	addApiKey: (name: string, scopes: string[]) => ApiKey & { secret: string };
	revokeApiKey: (id: string) => void;
	upsertWebhook: (hook: Webhook) => void;

	reset: () => void;
}

const defaultPrefs: NotificationPrefs = { mentions: true, assignments: true, sla: true, statusChanges: true, automationDigest: false, sprintEvents: true, push: false, quietHours: true };

const act = (actor: Actor, text: string, system = false): Activity => ({ id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, at: Date.now(), actorName: actor.name, text, system });

export const useDb = create<DbState>()(
	persist(
		(set, get) => {
			const patchTicket = (key: string, fn: (t: Ticket) => Ticket) =>
				set({ tickets: get().tickets.map((t) => (t.key === key ? fn(t) : t)) });

			return {
				tickets: seedTickets,
				projects: seedProjects,
				members: seedTeam,
				notifications: seedNotifications,
				prefs: defaultPrefs,
				nextKey: { ...nextKeyNumbers },
				clientAccounts: seedClientAccounts,
				assets: seedAssets,
				visits: seedVisits,
				kb: seedKb,
				programs: seedPrograms,
				activities: seedActivities,
				participants: seedParticipants,
				expenses: seedExpenses,
				settings: defaultSettings,

				createTicket(input, actor) {
					const n = get().nextKey[input.projectKey] ?? 1;
					const key = `${input.projectKey}-${n}`;
					const now = Date.now();
					const client = clients.find((c) => c.id === input.clientId);
					const sla =
						input.projectKey === 'KS' && client
							? {
									policy: `${client.tier.split(' ')[0]} ${input.priority}`,
									responseTargetMin: { P1: 15, P2: 60, P3: 240, P4: 480 }[input.priority],
									resolveDueAt: now + { P1: 4, P2: 8, P3: 48, P4: 120 }[input.priority] * 60 * 60_000,
									resolveTargetLabel: { P1: '4h', P2: '8h', P3: '2d', P4: '5d' }[input.priority],
								}
							: undefined;
					const ticket: Ticket = {
						key,
						projectKey: input.projectKey,
						title: input.title.trim(),
						category: input.category ?? '',
						type: input.type,
						priority: input.priority,
						status: input.assigneeId ? 'Open' : 'New',
						channel: input.channel ?? 'internal',
						clientId: input.clientId,
						site: input.site,
						assigneeId: input.assigneeId,
						reporter: input.reporterName ? { name: input.reporterName, isClient: !!input.reporterIsClient } : { name: actor.name, isClient: false, id: actor.id },
						labels: input.labels ?? [],
						description: input.description ?? '',
						createdAt: now,
						updatedAt: now,
						dueAt: input.dueAt,
						sla,
						epicId: input.epicId,
						sprint: input.sprint,
						storyPoints: input.storyPoints,
						timeLoggedMin: 0,
						asset: input.asset,
						impact: input.impact,
						subtasks: [],
						links: [],
						comments: [],
						activity: [act(actor, 'created the ticket')],
						attachments: input.attachments ?? [],
						watcherIds: [actor.id],
						mentionedIds: [],
						createdById: actor.id,
					};
					set({ tickets: [ticket, ...get().tickets], nextKey: { ...get().nextKey, [input.projectKey]: n + 1 } });
					return ticket;
				},

				updateTicket(key, patch, actor, activityText) {
					patchTicket(key, (t) => ({ ...t, ...patch, updatedAt: Date.now(), activity: activityText ? [...t.activity, act(actor, activityText)] : t.activity }));
				},

				transition(key, to, actor) {
					const t = get().tickets.find((x) => x.key === key);
					if (!t || !transitions[t.status].includes(to)) return false;
					const done = statusCategory[to] === 'done';
					patchTicket(key, (x) => ({
						...x,
						status: to,
						resolvedAt: done ? Date.now() : undefined,
						updatedAt: Date.now(),
						activity: [...x.activity, act(actor, `changed status ${x.status} → ${to}`)],
					}));
					return true;
				},

				assign(key, assigneeId, actor) {
					const who = assigneeId ? (team.find((m) => m.id === assigneeId)?.name ?? assigneeId) : 'nobody';
					patchTicket(key, (t) => ({
						...t,
						assigneeId,
						status: t.status === 'New' && assigneeId ? 'Open' : t.status,
						updatedAt: Date.now(),
						activity: [...t.activity, act(actor, assigneeId ? `assigned to ${who}` : 'unassigned the ticket')],
					}));
				},

				setPriority(key, priority, actor) {
					patchTicket(key, (t) => ({ ...t, priority, updatedAt: Date.now(), activity: [...t.activity, act(actor, `changed priority ${t.priority} → ${priority}`)] }));
				},

				addComment(key, input, actor) {
					const mentioned = team.filter((m) => new RegExp(`@${m.name.split(' ')[0]}\\b`, 'i').test(input.body)).map((m) => m.id);
					patchTicket(key, (t) => ({
						...t,
						updatedAt: Date.now(),
						mentionedIds: Array.from(new Set([...t.mentionedIds, ...mentioned])),
						comments: [...t.comments, { id: `c_${Date.now()}`, authorId: actor.id, authorName: actor.name, body: input.body.trim(), internal: input.internal, at: Date.now(), channel: input.channel }],
						activity: [...t.activity, act(actor, input.internal ? 'added an internal note' : 'replied to the client')],
					}));
				},

				toggleSubtask(key, subKey, actor) {
					patchTicket(key, (t) => {
						const sub = t.subtasks.find((s) => s.key === subKey);
						return {
							...t,
							updatedAt: Date.now(),
							subtasks: t.subtasks.map((s) => (s.key === subKey ? { ...s, done: !s.done, status: !s.done ? 'Resolved' : 'Open' } : s)),
							activity: [...t.activity, act(actor, `${sub?.done ? 'reopened' : 'completed'} sub-task ${subKey}`)],
						};
					});
				},

				addSubtask(key, title, actor) {
					const t = get().tickets.find((x) => x.key === key);
					if (!t) return;
					const n = get().nextKey[t.projectKey] ?? 1;
					const sub: Subtask = { key: `${t.projectKey}-${n}`, title: title.trim(), done: false, status: 'Open' };
					set({ nextKey: { ...get().nextKey, [t.projectKey]: n + 1 } });
					patchTicket(key, (x) => ({ ...x, updatedAt: Date.now(), subtasks: [...x.subtasks, sub], activity: [...x.activity, act(actor, `added sub-task ${sub.key}`)] }));
				},

				addLabel(key, label, actor) {
					const l = label.trim().toLowerCase().replace(/\s+/g, '-');
					if (!l) return;
					patchTicket(key, (t) => (t.labels.includes(l) ? t : { ...t, labels: [...t.labels, l], updatedAt: Date.now(), activity: [...t.activity, act(actor, `added label ${l}`)] }));
				},

				removeLabel(key, label, actor) {
					patchTicket(key, (t) => ({ ...t, labels: t.labels.filter((x) => x !== label), updatedAt: Date.now(), activity: [...t.activity, act(actor, `removed label ${label}`)] }));
				},

				logTime(key, minutes, actor) {
					patchTicket(key, (t) => ({ ...t, timeLoggedMin: t.timeLoggedMin + minutes, updatedAt: Date.now(), activity: [...t.activity, act(actor, `logged ${minutes} min`)] }));
				},

				toggleWatch(key, userId) {
					patchTicket(key, (t) => ({ ...t, watcherIds: t.watcherIds.includes(userId) ? t.watcherIds.filter((w) => w !== userId) : [...t.watcherIds, userId] }));
				},

				addLink(key, link, actor) {
					patchTicket(key, (t) => ({ ...t, links: [...t.links, link], updatedAt: Date.now(), activity: [...t.activity, act(actor, `linked ${link.key} (${link.type})`)] }));
				},

				removeLink(key, link, actor) {
					patchTicket(key, (t) => ({ ...t, links: t.links.filter((l) => !(l.key === link.key && l.type === link.type)), updatedAt: Date.now(), activity: [...t.activity, act(actor, `removed link to ${link.key}`)] }));
				},

				deleteTicket(key) {
					set({ tickets: get().tickets.filter((t) => t.key !== key) });
				},

				bulkUpdate(keys, patch, actor) {
					let n = 0;
					set({
						tickets: get().tickets.map((t) => {
							if (!keys.includes(t.key)) return t;
							let next = t;
							if (patch.status && transitions[t.status].includes(patch.status)) {
								next = { ...next, status: patch.status, resolvedAt: statusCategory[patch.status] === 'done' ? Date.now() : undefined, activity: [...next.activity, act(actor, `changed status ${t.status} → ${patch.status} (bulk)`)] };
							}
							if (patch.assigneeId !== undefined) {
								const id = patch.assigneeId ?? undefined;
								next = { ...next, assigneeId: id, activity: [...next.activity, act(actor, id ? `assigned to ${team.find((m) => m.id === id)?.name} (bulk)` : 'unassigned (bulk)')] };
							}
							if (patch.priority) next = { ...next, priority: patch.priority, activity: [...next.activity, act(actor, `changed priority to ${patch.priority} (bulk)`)] };
							if (next !== t) {
								n++;
								next = { ...next, updatedAt: Date.now() };
							}
							return next;
						}),
					});
					return n;
				},

				createProject(input, actor) {
					const key = input.key.toUpperCase();
					const project: Project = {
						id: `p_${key.toLowerCase()}_${Date.now()}`,
						key,
						name: input.name.trim(),
						description: input.description.trim(),
						kind: input.kind,
						leadId: input.leadId,
						memberIds: Array.from(new Set([input.leadId, actor.id])),
						starred: false,
						archived: false,
						color: input.kind === 'software' ? '#1e3a47' : '#2e6f86',
						stats: { open: 0, openDelta: 'new project', cycleDays: 0, cycleDelta: 'no data yet', overdue: 0, overdueDelta: 'no data yet', sprintPct: input.kind === 'software' ? 0 : undefined },
						activity: [{ id: `pa_${Date.now()}`, actorName: actor.name, text: 'created the project', at: Date.now() }],
						createdAt: Date.now(),
					};
					set({ projects: [project, ...get().projects], nextKey: { ...get().nextKey, [key]: 1 } });
					return project;
				},

				toggleStar(projectId) {
					set({ projects: get().projects.map((p) => (p.id === projectId ? { ...p, starred: !p.starred } : p)) });
				},

				archiveProject(projectId, archived) {
					set({ projects: get().projects.map((p) => (p.id === projectId ? { ...p, archived } : p)) });
				},

				updateProject(projectId, patch) {
					set({ projects: get().projects.map((p) => (p.id === projectId ? { ...p, ...patch } : p)) });
				},
				deleteProject(projectId) {
					const project = get().projects.find((p) => p.id === projectId);
					if (!project) return;
					set({ projects: get().projects.filter((p) => p.id !== projectId), tickets: get().tickets.filter((t) => t.projectKey !== project.key) });
				},

				inviteMember(input) {
					const tints: Tint[] = ['teal', 'tan', 'green', 'lavender', 'grey'];
					const m: TeamMember = {
						id: `u_${input.email.split('@')[0]!.replace(/[^a-z0-9]/gi, '')}_${Date.now().toString(36)}`,
						name: input.name.trim() || input.email.split('@')[0]!,
						email: input.email.trim().toLowerCase(),
						role: input.role,
						base: input.base,
						team: input.team,
						tint: tints[get().members.length % tints.length]!,
						presence: 'Away',
						status: 'Invited',
						invitedAt: Date.now(),
						skills: [],
						teams: [input.team],
					};
					set({ members: [...get().members, m] });
					return m;
				},
				updateMember(id, patch) {
					set({ members: get().members.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
				},
				setMemberStatus(id, status) {
					set({ members: get().members.map((m) => (m.id === id ? { ...m, status, presence: status === 'Active' ? 'Active' : 'Away' } : m)) });
				},
				resendInvite(id) {
					set({ members: get().members.map((m) => (m.id === id ? { ...m, invitedAt: Date.now() } : m)) });
				},

				markRead(id, read = true) {
					set({ notifications: get().notifications.map((n) => (n.id === id ? { ...n, read } : n)) });
				},
				markAllRead() {
					set({ notifications: get().notifications.map((n) => ({ ...n, read: true })) });
				},
				snooze(id, minutes) {
					set({ notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true, snoozedUntil: Date.now() + minutes * 60_000 } : n)) });
				},
				approveNotification(id) {
					set({ notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true, approved: true } : n)) });
				},
				setPrefs(patch) {
					set({ prefs: { ...get().prefs, ...patch } });
				},

				// ---- clients ----
				addClient(input) {
					const tints: Tint[] = ['teal', 'tan', 'green', 'lavender', 'grey'];
					const c: ClientAccount = {
						id: `c_${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 16)}_${Date.now().toString(36)}`,
						name: input.name.trim(),
						initials: input.name.split(/\s+/).slice(0, 2).map((w) => w[0]!.toUpperCase()).join(''),
						rc: input.rc || 'RC —',
						industry: input.industry,
						city: input.city,
						plan: input.plan,
						status: input.plan === 'Trial' ? 'Trial' : 'Active',
						tint: tints[get().clientAccounts.length % tints.length]!,
						siteList: [{ id: 's1', name: `${input.city} office`, address: '—', contactName: input.contactName, assets: 0, open: 0 }],
						contacts: [{ id: 'k1', name: input.contactName, role: 'Primary contact', primary: true, channel: 'whatsapp', phone: input.contactPhone }],
						assetsCount: 0,
						hoursUsed: 0,
						hoursIncluded: { Gold: 40, Silver: 20, Bronze: 10, Trial: 0 }[input.plan],
						mrr: { Gold: 2_400_000, Silver: 1_150_000, Bronze: 450_000, Trial: 0 }[input.plan],
						renewalAt: Date.now() + (input.plan === 'Trial' ? 14 : 365) * 86_400_000,
						since: Date.now(),
						accountManagerId: input.accountManagerId,
						invoices: [],
						notes: [],
						contract: { plan: input.plan, termStart: Date.now(), termEnd: Date.now() + 365 * 86_400_000, feeMonthly: { Gold: 2_400_000, Silver: 1_150_000, Bronze: 450_000, Trial: 0 }[input.plan], hoursIncluded: { Gold: 40, Silver: 20, Bronze: 10, Trial: 0 }[input.plan], overageRate: 20_000, coverage: input.plan === 'Gold' ? 'Mon–Sat 07:00–20:00 · P1 24/7' : 'Mon–Fri 08:00–18:00', slaSummary: input.plan === 'Gold' ? 'P1 15m / 4h · P2 30m / 8h · P3 2h / 2d' : 'P1 30m / 8h · P2 1h / 1d · P3 4h / 3d', scope: 'To be defined', excluded: '—', documents: [] },
					};
					set({ clientAccounts: [c, ...get().clientAccounts] });
					return c;
				},
				updateClient(id, patch) {
					set({ clientAccounts: get().clientAccounts.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
				},
				addSite(clientId, site) {
					set({ clientAccounts: get().clientAccounts.map((c) => (c.id === clientId ? { ...c, siteList: [...c.siteList, { ...site, id: `s_${Date.now()}`, assets: 0, open: 0 }] } : c)) });
				},
				addContact(clientId, contact) {
					set({ clientAccounts: get().clientAccounts.map((c) => (c.id === clientId ? { ...c, contacts: [...c.contacts, { ...contact, id: `k_${Date.now()}` }] } : c)) });
				},
				addClientNote(clientId, body, actor) {
					const note: ClientNote = { id: `n_${Date.now()}`, authorName: actor.name, body: body.trim(), at: Date.now() };
					set({ clientAccounts: get().clientAccounts.map((c) => (c.id === clientId ? { ...c, notes: [note, ...c.notes] } : c)) });
				},
				setInvoiceStatus(clientId, invoiceId, status) {
					set({ clientAccounts: get().clientAccounts.map((c) => (c.id === clientId ? { ...c, invoices: c.invoices.map((i) => (i.id === invoiceId ? { ...i, status } : i)) } : c)) });
				},

				// ---- assets ----
				addAsset(input) {
					set({ assets: [{ ...input, history: [{ at: Date.now(), text: 'Added to inventory' }] }, ...get().assets] });
				},
				updateAsset(tag, patch, note) {
					set({ assets: get().assets.map((a) => (a.tag === tag ? { ...a, ...patch, history: note ? [{ at: Date.now(), text: note }, ...a.history] : a.history } : a)) });
				},
				deleteAsset(tag) {
					set({ assets: get().assets.filter((a) => a.tag !== tag) });
				},

				// ---- visits ----
				scheduleVisit(id, engineerId, startAt) {
					set({ visits: get().visits.map((v) => (v.id === id ? { ...v, engineerId, startAt, status: 'Scheduled' } : v)) });
				},
				unscheduleVisit(id) {
					set({ visits: get().visits.map((v) => (v.id === id ? { ...v, engineerId: undefined, startAt: undefined, status: 'Unscheduled', checkpoints: v.checkpoints.map((c) => ({ ...c, done: false, at: undefined })) } : v)) });
				},
				advanceVisit(id) {
					const order: VisitStatus[] = ['Scheduled', 'En route', 'On site', 'Done'];
					set({
						visits: get().visits.map((v) => {
							if (v.id !== id) return v;
							const idx = v.checkpoints.findIndex((c) => !c.done);
							const checkpoints = idx === -1 ? v.checkpoints : v.checkpoints.map((c, i) => (i === idx ? { ...c, done: true, at: Date.now() } : c));
							const remaining = checkpoints.filter((c) => !c.done).length;
							const status: VisitStatus = remaining === 0 ? 'Done' : idx <= 0 ? 'En route' : idx === 1 ? 'On site' : v.status === 'Scheduled' ? 'En route' : 'On site';
							return { ...v, checkpoints, status: order.includes(status) ? status : v.status };
						}),
					});
				},
				createVisit(input) {
					const client = get().clientAccounts.find((c) => c.id === input.clientId);
					const v: Visit = {
						id: `v_${Date.now()}`,
						...input,
						status: input.engineerId && input.startAt ? 'Scheduled' : 'Unscheduled',
						checkpoints: [{ label: 'Dispatched', done: false }, { label: 'Checked in', done: false }, { label: 'Working', done: false }, { label: 'Visit report', done: false }],
						parts: [],
						mapX: 20 + Math.round(Math.random() * 60),
						mapY: 20 + Math.round(Math.random() * 50),
						address: input.address || client?.siteList[0]?.address || '—',
					};
					set({ visits: [v, ...get().visits] });
					return v;
				},
				approvePart(visitId, partName) {
					set({ visits: get().visits.map((v) => (v.id === visitId ? { ...v, parts: v.parts.map((p) => (p.name === partName ? { ...p, approval: 'approved' } : p)) } : v)) });
				},

				// ---- knowledge base ----
				createArticle(input, actor) {
					const a: KbArticle = {
						id: `a_${Date.now()}`,
						slug: input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || `article-${Date.now()}`,
						title: input.title.trim(),
						category: input.category,
						summary: input.summary.trim(),
						body: input.body,
						readMin: Math.max(1, Math.round(input.body.split(/\s+/).length / 180)),
						views: 0,
						helpful: 0,
						notHelpful: 0,
						updatedAt: Date.now(),
						authorId: actor.id,
						visibility: input.visibility,
						status: input.status ?? 'Published',
						tags: input.tags,
					};
					set({ kb: [a, ...get().kb] });
					return a;
				},
				updateArticle(id, patch) {
					set({ kb: get().kb.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a)) });
				},
				deleteArticle(id) {
					set({ kb: get().kb.filter((a) => a.id !== id) });
				},
				voteArticle(id, helpful) {
					set({ kb: get().kb.map((a) => (a.id === id ? { ...a, helpful: a.helpful + (helpful ? 1 : 0), notHelpful: a.notHelpful + (helpful ? 0 : 1) } : a)) });
				},
				viewArticle(id) {
					set({ kb: get().kb.map((a) => (a.id === id ? { ...a, views: a.views + 1 } : a)) });
				},

				// ---- settings ----
				updateSettings(section, patch) {
					const current = get().settings[section];
					set({ settings: { ...get().settings, [section]: typeof current === 'object' && !Array.isArray(current) ? { ...(current as object), ...(patch as object) } : patch } });
				},
				setSettings(section, value) {
					set({ settings: { ...get().settings, [section]: value } });
				},
				updateSlaPolicy(id, patch) {
					set({ settings: { ...get().settings, slaPolicies: get().settings.slaPolicies.map((p) => (p.id === id ? { ...p, ...patch } : p)) } });
				},
				updateSlaRow(policyId, index, patch) {
					set({ settings: { ...get().settings, slaPolicies: get().settings.slaPolicies.map((p) => (p.id === policyId ? { ...p, rows: p.rows.map((r, i) => (i === index ? { ...r, ...patch } : r)) } : p)) } });
				},
				upsertAutomation(rule) {
					const list = get().settings.automation;
					set({ settings: { ...get().settings, automation: list.some((r) => r.id === rule.id) ? list.map((r) => (r.id === rule.id ? rule : r)) : [...list, rule] } });
				},
				addApiKey(name, scopes) {
					const secret = `ld_live_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 18)}`;
					const key: ApiKey = { id: `k_${Date.now()}`, name, prefix: secret.slice(0, 12), createdAt: Date.now(), scopes };
					set({ settings: { ...get().settings, apiKeys: [...get().settings.apiKeys, key] } });
					return { ...key, secret };
				},
				revokeApiKey(id) {
					set({ settings: { ...get().settings, apiKeys: get().settings.apiKeys.filter((k) => k.id !== id) } });
				},
				upsertWebhook(hook) {
					const list = get().settings.webhooks;
					set({ settings: { ...get().settings, webhooks: list.some((w) => w.id === hook.id) ? list.map((w) => (w.id === hook.id ? hook : w)) : [...list, hook] } });
				},

				// -- Programmes, training and events ------------------------------
				//
				// The mock mirrors what the server enforces rather than being looser:
				// the same activity transitions, the same capacity check, the same
				// "only approved and paid count" rule. A screen that behaves one way
				// against mocks and another against the API is worse than no mock.

				createProgram(input, actor) {
					const program: Program = {
						id: `prog_${Math.random().toString(36).slice(2, 8)}`,
						key: input.key.toUpperCase(),
						name: input.name.trim(),
						description: input.description ?? '',
						clientId: input.clientId,
						leadId: input.leadId ?? actor.id,
						leadName: actor.name,
						status: 'planned',
						startsOn: input.startsOn,
						endsOn: input.endsOn,
						budgetAmount: input.budgetAmount,
						currency: input.currency || 'NGN',
						archived: false,
						activityCount: 0,
						upcomingCount: 0,
						createdAt: Date.now(),
					};
					set({ programs: [program, ...get().programs] });
					return program;
				},

				updateProgram(key, patch) {
					set({ programs: get().programs.map((p) => (p.key === key ? { ...p, ...patch } : p)) });
				},

				archiveProgram(key, archived) {
					set({ programs: get().programs.map((p) => (p.key === key ? { ...p, archived } : p)) });
				},

				deleteProgram(key) {
					const program = get().programs.find((p) => p.key === key);
					set({
						programs: get().programs.filter((p) => p.key !== key),
						activities: get().activities.filter((a) => a.programKey !== key),
						expenses: get().expenses.filter((e) => e.programKey !== program?.key),
					});
				},

				createActivity(programKey, input) {
					const program = get().programs.find((p) => p.key === programKey);
					// The key comes from a per-programme counter, the same way the
					// server allocates it from programs.next_seq.
					const taken = get().activities.filter((a) => a.programKey === programKey).length;
					const activity: ProgramActivity = {
						id: `act_${Math.random().toString(36).slice(2, 8)}`,
						key: `${programKey}-${taken + 1}`,
						programId: program?.id ?? '',
						programKey,
						kind: input.kind,
						title: input.title.trim(),
						description: input.description ?? '',
						status: 'planned',
						startsAt: input.startsAt,
						endsAt: input.endsAt,
						location: input.location,
						facilitatorId: input.facilitatorId,
						capacity: input.capacity,
						registeredCount: 0,
						attendedCount: 0,
						placesLeft: input.capacity ?? null,
						full: false,
						budgetAmount: input.budgetAmount,
						currency: program?.currency ?? 'NGN',
						transitions: [
							{ to: 'confirmed', name: 'Confirmed' },
							{ to: 'in_progress', name: 'In progress' },
							{ to: 'cancelled', name: 'Cancelled' },
						],
					};
					set({
						activities: [...get().activities, activity],
						programs: get().programs.map((p) =>
							p.key === programKey ? { ...p, activityCount: p.activityCount + 1 } : p,
						),
					});
					return activity;
				},

				updateActivity(key, patch) {
					set({ activities: get().activities.map((a) => (a.key === key ? { ...a, ...patch } : a)) });
				},

				transitionActivity(key, to) {
					const activity = get().activities.find((a) => a.key === key);
					if (!activity) return false;
					// Same map the server holds, so an illegal move is refused here too.
					const allowed: Record<ActivityStatus, ActivityStatus[]> = {
						planned: ['confirmed', 'in_progress', 'cancelled'],
						confirmed: ['in_progress', 'planned', 'cancelled'],
						in_progress: ['completed', 'cancelled'],
						completed: [],
						cancelled: ['planned'],
					};
					if (!allowed[activity.status].includes(to)) return false;

					const labels: Record<ActivityStatus, string> = {
						planned: 'Planned',
						confirmed: 'Confirmed',
						in_progress: 'In progress',
						completed: 'Completed',
						cancelled: 'Cancelled',
					};
					set({
						activities: get().activities.map((a) =>
							a.key === key
								? { ...a, status: to, transitions: allowed[to].map((t) => ({ to: t, name: labels[t] })) }
								: a,
						),
					});
					return true;
				},

				deleteActivity(key) {
					const activity = get().activities.find((a) => a.key === key);
					set({
						activities: get().activities.filter((a) => a.key !== key),
						participants: get().participants.filter((p) => p.activityId !== activity?.id),
					});
				},

				addParticipant(activityId, input) {
					const activity = get().activities.find((a) => a.id === activityId);
					// Capacity is checked on registering, as the server does.
					if (activity?.capacity != null && activity.registeredCount >= activity.capacity) return;

					const participant: ProgramParticipant = {
						id: `pp_${Math.random().toString(36).slice(2, 8)}`,
						activityId,
						kind: input.kind,
						name: input.name.trim(),
						email: input.email,
						userId: input.userId,
						clientContactId: input.clientContactId,
						status: 'registered',
						registeredAt: Date.now(),
						notes: input.notes,
					};
					set({
						participants: [...get().participants, participant],
						activities: get().activities.map((a) =>
							a.id === activityId
								? {
										...a,
										registeredCount: a.registeredCount + 1,
										placesLeft: a.capacity == null ? null : Math.max(0, a.capacity - (a.registeredCount + 1)),
										full: a.capacity != null && a.registeredCount + 1 >= a.capacity,
									}
								: a,
						),
					});
				},

				setParticipantStatus(id, status) {
					const participant = get().participants.find((p) => p.id === id);
					set({
						participants: get().participants.map((p) =>
							p.id === id
								? { ...p, status, checkedInAt: status === 'attended' ? (p.checkedInAt ?? Date.now()) : undefined }
								: p,
						),
						activities: get().activities.map((a) =>
							a.id === participant?.activityId
								? {
										...a,
										attendedCount:
											status === 'attended' && participant.status !== 'attended'
												? a.attendedCount + 1
												: a.attendedCount,
									}
								: a,
						),
					});
				},

				removeParticipant(id) {
					const participant = get().participants.find((p) => p.id === id);
					set({
						participants: get().participants.filter((p) => p.id !== id),
						activities: get().activities.map((a) =>
							a.id === participant?.activityId
								? {
										...a,
										registeredCount: Math.max(0, a.registeredCount - 1),
										placesLeft: a.capacity == null ? null : Math.max(0, a.capacity - (a.registeredCount - 1)),
										full: false,
									}
								: a,
						),
					});
				},

				// -- Expenses -----------------------------------------------------

				createExpense(input, actor) {
					const program = get().programs.find((p) => p.key === input.programKey);
					const activity = get().activities.find((a) => a.key === input.activityKey);
					const owningProgram =
						program ?? get().programs.find((p) => p.key === activity?.programKey);

					const expense: Expense = {
						id: `exp_${Math.random().toString(36).slice(2, 8)}`,
						programKey: owningProgram?.key,
						programName: owningProgram?.name,
						activityKey: activity?.key,
						activityTitle: activity?.title,
						category: input.category,
						description: input.description ?? '',
						amount: input.amount,
						// Inherited from the programme, never chosen per expense.
						currency: owningProgram?.currency ?? 'NGN',
						incurredOn: input.incurredOn,
						status: input.submit ? 'submitted' : 'draft',
						countsAsSpent: false,
						submittedById: actor.id,
						submittedByName: actor.name,
						notes: input.notes,
						receiptCount: 0,
						createdAt: Date.now(),
					};
					set({ expenses: [expense, ...get().expenses] });
					return expense;
				},

				updateExpense(id, patch) {
					set({ expenses: get().expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
				},

				setExpenseStatus(id, status, rejectionReason) {
					const decided = status === 'approved' || status === 'rejected' || status === 'paid';
					set({
						expenses: get().expenses.map((e) =>
							e.id === id
								? {
										...e,
										status,
										// Only approved and paid count against a budget.
										countsAsSpent: status === 'approved' || status === 'paid',
										decidedByName: decided ? e.decidedByName ?? 'You' : undefined,
										decidedAt: decided ? Date.now() : undefined,
										rejectionReason: status === 'rejected' ? rejectionReason : undefined,
									}
								: e,
						),
					});
				},

				deleteExpense(id) {
					set({ expenses: get().expenses.filter((e) => e.id !== id) });
				},

				reset() {
					set({ tickets: seedTickets, projects: seedProjects, members: seedTeam, notifications: seedNotifications, prefs: defaultPrefs, nextKey: { ...nextKeyNumbers }, clientAccounts: seedClientAccounts, assets: seedAssets, visits: seedVisits, kb: seedKb, settings: defaultSettings });
				},
			};
		},
		{
			name: 'ledgedesk.db',
			version: SEED_VERSION,
			storage: createJSONStorage(() => sessionStorage),
			partialize: (s) => ({ tickets: s.tickets, projects: s.projects, members: s.members, notifications: s.notifications, prefs: s.prefs, nextKey: s.nextKey, clientAccounts: s.clientAccounts, assets: s.assets, visits: s.visits, kb: s.kb, settings: s.settings }),
			migrate: () => ({ tickets: seedTickets, projects: seedProjects, members: seedTeam, notifications: seedNotifications, prefs: defaultPrefs, nextKey: { ...nextKeyNumbers }, clientAccounts: seedClientAccounts, assets: seedAssets, visits: seedVisits, kb: seedKb, settings: defaultSettings }),
		},
	),
);

// ---------- Lookups ----------

export const memberById = (id?: string): TeamMember | undefined => {
	if (!id) return undefined;
	if (isLiveApi()) return useMemberDirectory.getState().members.find((m) => m.id === id);
	return useDb.getState().members.find((m) => m.id === id);
};
export const memberByName = (name?: string): TeamMember | undefined => {
	if (!name) return undefined;
	const list = isLiveApi() ? useMemberDirectory.getState().members : useDb.getState().members;
	return list.find((m) => m.name === name);
};
export const unreadCount = (list: Notification[]) => list.filter((n) => !n.read && !(n.snoozedUntil && n.snoozedUntil > Date.now())).length;
export const clientById = (id?: string): Client | undefined => (id ? clients.find((c) => c.id === id) : undefined);
export const epicById = (id?: string): Epic | undefined => (id ? epics.find((e) => e.id === id) : undefined);

/** Whether the SLA clock is running for the ticket. */
export function slaRunning(t: Ticket) {
	return !!t.sla && statusCategory[t.status] !== 'done' && !slaPausedStatuses.includes(t.status);
}

/** Open ticket whose SLA resolves in under 2 hours (or is already breached). */
export function slaAtRisk(t: Ticket, now = Date.now()) {
	return slaRunning(t) && t.sla!.resolveDueAt - now < 2 * 60 * 60_000;
}

export const clientAccountById = (id?: string): ClientAccount | undefined => (id ? useDb.getState().clientAccounts.find((c) => c.id === id) : undefined);
export const formatNaira = (n: number) => `₦${n.toLocaleString('en-NG')}`;
export const formatNairaShort = (n: number) => (n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `₦${Math.round(n / 1000)}k` : `₦${n}`);
