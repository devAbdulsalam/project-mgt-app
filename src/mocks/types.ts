// Domain types shared by the mock database and the feature modules.

export type Channel = 'whatsapp' | 'email' | 'phone' | 'portal' | 'internal';
export type TicketType = 'task' | 'bug' | 'story' | 'epic' | 'subtask' | 'support';
export type Priority = 'P1' | 'P2' | 'P3' | 'P4';
export type Status =
	| 'New'
	| 'Open'
	| 'In progress'
	| 'Dispatched'
	| 'Scheduled'
	| 'Waiting on client'
	| 'Awaiting vendor'
	| 'In review'
	| 'Blocked'
	| 'Resolved'
	| 'Closed';
export type StatusCategory = 'todo' | 'inprogress' | 'done';
export type Impact = 'S1 · Branch down' | 'S2 · Degraded' | 'S3 · Single user' | 'S4 · Cosmetic';

export type Tint = 'teal' | 'tan' | 'green' | 'lavender' | 'grey';

export type MemberRole = 'Admin' | 'Operations Lead' | 'Support agent' | 'Field engineer' | 'Developer' | 'Product lead' | 'Designer' | 'Engineer' | 'Viewer' | 'Super Admin';
export type MemberStatus = 'Active' | 'Invited' | 'Deactivated';

export interface TeamMember {
	id: string;
	name: string;
	role: MemberRole;
	email: string;
	phone?: string;
	tint: Tint;
	/** Their photo, when they have uploaded one. The tint is the fallback. */
	avatarUrl?: string;
	base: string;
	team: string;
	presence: 'Active' | 'Away' | 'On site' | 'En route' | 'Break';
	status: MemberStatus;
	/** The workspace role as the API names it. Only set for live members. */
	accessRole?: 'owner' | 'admin' | 'member' | 'viewer';
	lastActiveAt?: number;
	joinedAt?: number;
	invitedAt?: number;
	skills: string[];
	teams: string[];
	clients?: string;
	capacity?: { perDay: number; bookedToday: number; days: string };
	signIn?: string;
	monthStats?: string;
}

export type NotificationKind = 'sla' | 'mention' | 'assigned' | 'status' | 'automation' | 'sprint' | 'reply' | 'csat';

export interface Notification {
	id: string;
	kind: NotificationKind;
	at: number;
	read: boolean;
	snoozedUntil?: number;
	actorName?: string;
	actorId?: string;
	ticketKey?: string;
	title: string; // main sentence, may contain {key}
	body?: string; // quoted text
	meta?: string; // "Support · Gold policy"
	projectName?: string;
	status?: Status;
	approved?: boolean;
}

export interface NotificationPrefs {
	mentions: boolean;
	assignments: boolean;
	sla: boolean;
	statusChanges: boolean;
	automationDigest: boolean;
	sprintEvents: boolean;
	push: boolean;
	quietHours: boolean;
}

export interface Client {
	id: string;
	name: string;
	industry: string;
	tier: 'Gold retainer' | 'Gold' | 'Silver' | 'Bronze';
	sites: string[];
	contact: { name: string; phone: string };
	healthPct: number;
}

export interface Epic {
	id: string;
	projectKey: string;
	name: string;
	done: number;
	total: number;
	dueLabel: string;
	status: 'To do' | 'In progress' | 'Done';
}

export interface Sprint {
	name: string;
	daysLeft: number;
	points: number;
	remaining: number;
	/** Remaining points per day since sprint start, for the burndown. */
	burndown: number[];
	totalDays: number;
}

export interface Project {
	id: string;
	key: string;
	name: string;
	description: string;
	kind: 'service' | 'software';
	leadId: string;
	memberIds: string[];
	starred: boolean;
	archived: boolean;
	color: string;
	sprint?: Sprint;
	/** Seeded aggregate; live tickets add on top in the UI. */
	stats: { open: number; cycleDays: number; cycleDelta: string; overdue: number; overdueDelta: string; openDelta: string; sprintPct?: number };
	statusDistribution?: { label: string; count: number; color: string }[];
	activity: { id: string; actorName: string; text: string; ticketKey?: string; at: number }[];
	createdAt: number;
	/** Optional per-project configuration; see ProjectSettings. */
	settings?: ProjectSettings;
}

export interface Subtask {
	key: string;
	title: string;
	done: boolean;
	assigneeId?: string;
	status?: Status;
}

export interface TicketLink {
	type: 'is blocked by' | 'blocks' | 'relates to' | 'duplicates';
	key: string;
}

export interface Comment {
	id: string;
	authorId?: string;
	authorName: string;
	body: string;
	internal: boolean;
	at: number;
	channel?: Channel;
	fromClient?: boolean;
}

export interface Activity {
	id: string;
	at: number;
	actorName: string;
	text: string;
	system?: boolean;
}

export interface Attachment {
	id: string;
	name: string;
	/** Human-readable, e.g. "2.4 MB". `bytes` is the number to compare. */
	size: string;
	kind: 'image' | 'log' | 'pdf' | 'other';
	bytes?: number;
	contentType?: string;
	/**
	 * Where to fetch it. A signed, expiring link from the API, or an object URL
	 * while the app is running on mock data. Absent means the file exists only as
	 * a row — nothing to open.
	 */
	url?: string;
	/** `skipped` means no scanner was configured, not that the file is clean. */
	scanStatus?: 'clean' | 'infected' | 'failed' | 'skipped';
}

export interface Sla {
	policy: string;
	responseTargetMin: number;
	respondedAfterMin?: number;
	resolveDueAt: number;
	resolveTargetLabel: string;
}

export interface Ticket {
	key: string;
	projectKey: string;
	title: string;
	category: string; // "Security · Windows Server 2019"
	type: TicketType;
	priority: Priority;
	status: Status;
	channel: Channel;
	clientId?: string;
	site?: string;
	assigneeId?: string;
	reporter: { name: string; isClient: boolean; id?: string };
	labels: string[];
	description: string;
	createdAt: number;
	updatedAt: number;
	resolvedAt?: number;
	dueAt?: number;
	sla?: Sla;
	epicId?: string;
	sprint?: string;
	storyPoints?: number;
	timeLoggedMin: number;
	timeEstimateMin?: number;
	asset?: string;
	impact?: Impact;
	subtasks: Subtask[];
	links: TicketLink[];
	comments: Comment[];
	activity: Activity[];
	attachments: Attachment[];
	watcherIds: string[];
	mentionedIds: string[];
	createdById?: string;
}

// ---------------------------------------------------------------------------
// Clients, assets, visits, knowledge base, settings

export type PlanTier = 'Gold' | 'Silver' | 'Bronze' | 'Trial';

export interface ClientContact {
	id: string;
	name: string;
	role: string;
	primary?: boolean;
	channel: 'whatsapp' | 'email' | 'phone';
	phone?: string;
	email?: string;
}

export interface ClientSite {
	id: string;
	name: string;
	address: string;
	contactName: string;
	assets: number;
	open: number;
	note?: string;
}

export interface Invoice {
	id: string;
	number: string;
	label: string;
	amount: number;
	status: 'Paid' | 'Overdue' | 'Due' | 'Draft';
	issuedAt: number;
	dueAt: number;
}

export interface ClientNote {
	id: string;
	authorName: string;
	body: string;
	at: number;
}

export interface Contract {
	plan: string;
	termStart: number;
	termEnd: number;
	feeMonthly: number;
	hoursIncluded: number;
	overageRate: number;
	coverage: string;
	slaSummary: string;
	scope: string;
	excluded: string;
	documents: string[];
}

export interface ClientAccount {
	id: string;
	name: string;
	initials: string;
	rc: string;
	industry: string;
	city: string;
	plan: PlanTier;
	status: 'Active' | 'Trial' | 'Lapsed';
	healthPct?: number;
	siteList: ClientSite[];
	contacts: ClientContact[];
	assetsCount: number;
	hoursUsed: number;
	hoursIncluded: number;
	mrr: number;
	renewalAt: number;
	since: number;
	accountManagerId: string;
	csat?: number;
	csatCount?: number;
	invoices: Invoice[];
	notes: ClientNote[];
	contract: Contract;
	tint: Tint;
}

export type AssetCategory = 'endpoint' | 'network' | 'server' | 'power' | 'licence' | 'pos';
export type AssetStatus = 'Healthy' | 'Degraded' | 'Down' | 'In stock' | 'Active' | 'Expiring';

export interface Asset {
	tag: string;
	name: string;
	detail: string;
	serial: string;
	category: AssetCategory;
	clientId: string;
	site: string;
	location?: string;
	user?: string;
	status: AssetStatus;
	statusDetail?: string;
	agent: string;
	warrantyAt: number;
	openTicketKey?: string;
	firmware?: string;
	firmwareAvailable?: string;
	wan?: string;
	purchased?: string;
	monitoring?: string;
	history: { at: number; text: string }[];
}

export type VisitStatus = 'Unscheduled' | 'Scheduled' | 'En route' | 'On site' | 'Done';

export interface Visit {
	id: string;
	ticketKey: string;
	title: string;
	clientId: string;
	site: string;
	address: string;
	priority: Priority;
	engineerId?: string;
	status: VisitStatus;
	startAt?: number;
	durationMin: number;
	window?: string;
	checkpoints: { label: string; at?: number; done: boolean }[];
	parts: { name: string; amount: number; approval: 'covered' | 'needs approval' | 'approved' }[];
	region: string;
	mapX: number;
	mapY: number;
}

export interface KbArticle {
	id: string;
	slug: string;
	title: string;
	category: string;
	summary: string;
	body: string;
	readMin: number;
	views: number;
	helpful: number;
	notHelpful: number;
	updatedAt: number;
	authorId: string;
	visibility: 'internal' | 'public';
	status: 'Published' | 'Draft';
	tags: string[];
}

export interface SlaPolicyRow {
	priority: string;
	desc: string;
	responseMin: number;
	resolveHours: number;
	coverage: string;
	escalation: string;
	compliance?: number;
}

export interface SlaPolicy {
	id: string;
	plan: PlanTier;
	name: string;
	clients: number;
	note?: string;
	p1AllHours: boolean;
	escalateAt75: boolean;
	rows: SlaPolicyRow[];
}

export interface AutomationRule {
	id: string;
	name: string;
	trigger: string;
	condition: string;
	action: string;
	enabled: boolean;
	runs: number;
}

export interface ApiKey {
	id: string;
	name: string;
	prefix: string;
	createdAt: number;
	lastUsedAt?: number;
	scopes: string[];
}

export interface Webhook {
	id: string;
	url: string;
	events: string[];
	enabled: boolean;
	lastStatus?: string;
}

export interface OrgSettings {
	general: {
		companyName: string;
		slug: string;
		rc: string;
		tin: string;
		headOffice: string;
		supportPhone: string;
		supportEmail: string;
		ticketPrefix: string;
		timezone: string;
		currency: string;
		vatPct: number;
		dateFormat: string;
		languages: string[];
	};
	businessHours: { weekdays: { on: boolean; from: string; to: string }; saturday: { on: boolean; from: string; to: string }; sunday: { on: boolean; from: string; to: string } };
	branding: { accent: string; portalName: string; portalTagline: string; emailFooter: string; logoInitials: string };
	security: { enforce2fa: boolean; sessionHours: number; ssoDomain: string; ssoProvider: string; ipAllowlist: string; passwordMinLength: number };
	channels: { whatsapp: { enabled: boolean; number: string; templatesApproved: number }; email: { enabled: boolean; address: string; forwardFrom: string }; phone: { enabled: boolean; number: string; ivr: boolean }; portal: { enabled: boolean; url: string; allowGuest: boolean } };
	slaPolicies: SlaPolicy[];
	ticketTypes: { id: string; name: string; type: TicketType; categories: string[]; enabled: boolean }[];
	automation: AutomationRule[];
	csat: { enabled: boolean; channel: string; delayHours: number; question: string; followUpBelow: number };
	plans: { tier: PlanTier; name: string; monthly: number; hours: number; overage: number; description: string }[];
	invoicing: { prefix: string; dueDays: number; vatNumberShown: boolean; bankName: string; bankAccount: string; accountName: string; reminderDays: number[] };
	portal: { enabled: boolean; kbPublic: boolean; allowAttachments: boolean; showSla: boolean; csatOnPortal: boolean; customDomain: string };
	integrations: { id: string; name: string; description: string; connected: boolean; detail?: string }[];
	apiKeys: ApiKey[];
	webhooks: Webhook[];
	billing: { plan: string; seats: number; pricePerSeat: number; renewsAt: number; paymentMethod: string; usage: { whatsappConversations: number; whatsappLimit: number; sms: number; smsLimit: number; storageGb: number; storageLimit: number } };
	auditEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Per-project configuration (workflow, fields, boards, roles…). Stored on the project;
// anything missing falls back to defaults computed in the projects feature.

export type ProjectRole = 'Admin' | 'Member' | 'Viewer';
export type FieldType = 'text' | 'number' | 'select' | 'date' | 'user' | 'checkbox';

export interface WorkflowStatus {
	status: Status;
	category: StatusCategory;
	wipLimit?: number;
	note?: string;
}

export interface WorkflowTransition {
	id: string;
	from: Status;
	to: Status;
	name: string;
	roles: string;
	validators: string[];
	postFunctions: string[];
}

export interface CustomField {
	id: string;
	name: string;
	type: FieldType;
	required: boolean;
	options?: string[];
	appliesTo: TicketType[];
	description?: string;
}

export interface BoardColumnConfig {
	id: string;
	name: string;
	statuses: Status[];
	wip?: number;
}

export interface BoardConfig {
	id: string;
	name: string;
	type: 'kanban' | 'scrum';
	columns: BoardColumnConfig[];
	swimlane: 'none' | 'assignee' | 'epic' | 'priority';
	isDefault: boolean;
}

export interface ProjectNotificationRule {
	event: string;
	label: string;
	inApp: boolean;
	email: boolean;
	whatsapp: boolean;
}

export interface ProjectIntegration {
	id: string;
	name: string;
	description: string;
	connected: boolean;
	detail?: string;
}

export interface ProjectSettings {
	general: {
		defaultAssignee: 'lead' | 'unassigned' | 'round-robin';
		visibility: 'org' | 'private';
		startDay: 'monday' | 'sunday';
		/** Working days per week, used for capacity in Workload. */
		workingDays: number;
		/** Focus hours per working day, used for capacity in Workload. */
		focusHoursPerDay: number;
		clientVisible: boolean;
	};
	workflow: { name: string; statuses: WorkflowStatus[]; transitions: WorkflowTransition[]; publishedAt?: number };
	fields: CustomField[];
	boards: BoardConfig[];
	ticketTypes: { type: TicketType; enabled: boolean; defaultPriority: Priority; template: string }[];
	/** memberId → project role. Members without an entry are "Member"; the lead is always Admin. */
	roles: Record<string, ProjectRole>;
	automation: AutomationRule[];
	notifications: ProjectNotificationRule[];
	integrations: ProjectIntegration[];
}

// ---------------------------------------------------------------------------
// Programmes, training, events and their costs
//
// Timestamps are epoch milliseconds like the rest of this file. Calendar days
// (a programme's start date, the day an expense was incurred) stay as
// 'YYYY-MM-DD' strings: they have no time and no zone, and turning them into a
// timestamp is how a date shows as the day before for anyone east of UTC.

export type ProgramStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export type ActivityKind = 'training' | 'event' | 'workshop' | 'meeting' | 'other';
export type ActivityStatus = 'planned' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type ParticipantKind = 'member' | 'contact' | 'external';
export type ParticipantStatus = 'invited' | 'registered' | 'attended' | 'no_show' | 'cancelled';
export type ExpenseCategory =
	| 'venue'
	| 'materials'
	| 'catering'
	| 'transport'
	| 'facilitator_fee'
	| 'marketing'
	| 'equipment'
	| 'other';
export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';

export interface Program {
	id: string;
	key: string;
	name: string;
	description: string;
	clientId?: string;
	clientName?: string;
	leadId?: string;
	leadName?: string;
	status: ProgramStatus;
	/** 'YYYY-MM-DD', or undefined when open-ended. */
	startsOn?: string;
	endsOn?: string;
	/** Minor units — kobo. Undefined means nothing was budgeted. */
	budgetAmount?: number;
	currency: string;
	archived: boolean;
	activityCount: number;
	upcomingCount: number;
	createdAt: number;
}

export interface ProgramActivity {
	id: string;
	key: string;
	programId: string;
	programKey: string;
	kind: ActivityKind;
	title: string;
	description: string;
	status: ActivityStatus;
	startsAt?: number;
	endsAt?: number;
	location?: string;
	meetingUrl?: string;
	facilitatorId?: string;
	facilitatorName?: string;
	clientId?: string;
	clientName?: string;
	capacity?: number;
	registeredCount: number;
	attendedCount: number;
	/** Null when there is no capacity to count against. */
	placesLeft: number | null;
	full: boolean;
	budgetAmount?: number;
	currency?: string;
	/** What this activity may do next, as the server sees it. */
	transitions: { to: ActivityStatus; name: string }[];
}

export interface ProgramParticipant {
	id: string;
	activityId: string;
	kind: ParticipantKind;
	name: string;
	email?: string;
	userId?: string;
	clientContactId?: string;
	status: ParticipantStatus;
	registeredAt: number;
	checkedInAt?: number;
	notes?: string;
}

export interface Expense {
	id: string;
	programKey?: string;
	programName?: string;
	activityKey?: string;
	activityTitle?: string;
	category: ExpenseCategory;
	description: string;
	/** Minor units, in the owning programme's currency. */
	amount: number;
	currency: string;
	/** 'YYYY-MM-DD'. */
	incurredOn: string;
	status: ExpenseStatus;
	/** Whether this amount is counting against a budget yet. */
	countsAsSpent: boolean;
	submittedById?: string;
	submittedByName?: string;
	decidedByName?: string;
	decidedAt?: number;
	rejectionReason?: string;
	notes?: string;
	receiptCount: number;
	createdAt: number;
}

/** Planned versus actual, with the comparisons already worked out. */
export interface BudgetSummary {
	budgetAmount: number | null;
	currency: string;
	spent: number;
	/** Submitted but not yet decided — money that is probably about to count. */
	pending: number;
	invoiced: number;
	expenseCount: number;
	remaining: number | null;
	overBudget: boolean;
	/** Null rather than zero when nothing was budgeted: no plan, no percentage. */
	usedPct: number | null;
	margin: number | null;
	byCategory: { category: ExpenseCategory; total: number; count: number }[];
}
