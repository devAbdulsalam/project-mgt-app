/**
 * Tour content: chapters, interactive steps and the scripted "video" chapters.
 * Steps target elements marked with `data-tour="<id>"` in the app.
 */

export interface TourRoute {
	/** Path with `$org` placeholder. */
	path: string;
	search?: Record<string, string>;
}

export type Placement = 'auto' | 'top' | 'bottom' | 'left' | 'right';

export interface TourStep {
	id: string;
	chapter: string;
	title: string;
	body: string;
	tip?: string;
	target?: string;
	route: TourRoute;
	placement?: Placement;
	/** If the user is on a phone, use this target instead (or none). */
	mobileTarget?: string | null;
}

export const chapters = [
	{ id: 'navigate', name: 'Getting around', icon: '🧭' },
	{ id: 'dashboard', name: 'Dashboard', icon: '📊' },
	{ id: 'tickets', name: 'Tickets', icon: '🎫' },
	{ id: 'detail', name: 'Working a ticket', icon: '🛠️' },
	{ id: 'mywork', name: 'My Work & ⌘K', icon: '⚡' },
	{ id: 'projects', name: 'Projects & boards', icon: '📋' },
	{ id: 'clients', name: 'Clients & assets', icon: '🏢' },
	{ id: 'visits', name: 'Field visits', icon: '🚐' },
	{ id: 'knowledge', name: 'Knowledge & reports', icon: '📚' },
	{ id: 'admin', name: 'Team & settings', icon: '⚙️' },
] as const;

export type ChapterId = (typeof chapters)[number]['id'];

const dash: TourRoute = { path: '/$org/dashboard' };

export const steps: TourStep[] = [
	// Getting around
	{
		id: 'nav',
		chapter: 'navigate',
		title: 'Everything lives in the sidebar',
		body: 'Dashboard, your queue, tickets, projects, clients, assets, field visits, the knowledge base, reports, notifications, your team and settings. The badge on Notifications shows what needs you.',
		tip: 'Collapse the sidebar with the button beside the company name to get more room for tables.',
		target: 'nav',
		mobileTarget: 'tabbar',
		route: dash,
		placement: 'right',
	},
	{
		id: 'search',
		chapter: 'navigate',
		title: 'Search or run a command with ⌘K',
		body: 'Find a ticket, client or device by name or key, jump to any page, or run actions on the ticket you are looking at. Try a query like status:open assignee:me priority>=high.',
		target: 'search',
		mobileTarget: 'menu',
		route: dash,
		placement: 'bottom',
	},
	{
		id: 'bell',
		chapter: 'navigate',
		title: 'Notifications and help',
		body: 'The bell shows SLA alerts, mentions and assignments without leaving the page. The question mark opens this tour, the video and keyboard shortcuts any time.',
		target: 'bell',
		mobileTarget: null,
		route: dash,
		placement: 'bottom',
	},
	// Dashboard
	{
		id: 'range',
		chapter: 'dashboard',
		title: 'Pick the period',
		body: 'Today, 7, 30 or 90 days. Every widget on the dashboard follows the range, and the choice is kept in the URL so you can share the exact view.',
		target: 'dash-range',
		mobileTarget: null,
		route: dash,
		placement: 'bottom',
	},
	{
		id: 'kpis',
		chapter: 'dashboard',
		title: 'Your four numbers',
		body: 'Open tickets, first response time, SLA compliance and CSAT, each with the trend against the previous period. Green means better, orange means worse.',
		target: 'dash-kpis',
		mobileTarget: 'm-kpis',
		route: dash,
		placement: 'bottom',
	},
	{
		id: 'attention',
		chapter: 'dashboard',
		title: 'What needs attention right now',
		body: 'Tickets at risk of breaching SLA, unassigned P1s and clients waiting. Click any row to open the ticket in a side panel without leaving the dashboard.',
		target: 'dash-attention',
		mobileTarget: 'm-attention',
		route: dash,
		placement: 'left',
	},
	{
		id: 'newticket',
		chapter: 'dashboard',
		title: 'Log a ticket from anywhere',
		body: 'New Ticket opens the create form with templates, duplicate detection and a suggested engineer. Export downloads the whole dashboard as CSV.',
		target: 'dash-new',
		mobileTarget: 'm-new',
		route: dash,
		placement: 'bottom',
	},
	// Tickets
	{
		id: 'tabs',
		chapter: 'tickets',
		title: 'The helpdesk queue',
		body: 'Status tabs with live counts: everything open, unassigned, your queue, waiting on client, SLA at risk and resolved. Counts update as tickets move.',
		target: 'tickets-tabs',
		mobileTarget: 'm-tabs',
		route: { path: '/$org/tickets' },
		placement: 'bottom',
	},
	{
		id: 'table',
		chapter: 'tickets',
		title: 'Live SLA countdowns',
		body: 'Each row shows channel, priority, status, engineer and the time left on the SLA. Tick rows to assign, change status or priority in bulk. Click a row to open it.',
		target: 'tickets-table',
		mobileTarget: 'm-list',
		route: { path: '/$org/tickets' },
		placement: 'bottom',
	},
	{
		id: 'filters',
		chapter: 'tickets',
		title: 'Filter, sort and save views',
		body: 'Narrow by channel, priority, client, engineer or type. Sort by SLA to see what breaches first. Saved views remember a combination so the team shares the same queues.',
		target: 'tickets-filters',
		mobileTarget: null,
		route: { path: '/$org/tickets' },
		placement: 'bottom',
	},
	// Working a ticket
	{
		id: 'status',
		chapter: 'detail',
		title: 'Move it through the workflow',
		body: 'The status menu only offers transitions the workflow allows. Resolve, assign to yourself and log time are one click away. Waiting on client pauses the SLA clock.',
		target: 'ticket-status',
		route: { path: '/$org/tickets/KS-2043' },
		placement: 'bottom',
	},
	{
		id: 'subtasks',
		chapter: 'detail',
		title: 'Break work down and link it',
		body: 'Sub-tasks with progress, linked issues that block or relate, labels and attachments. Description and title edit inline.',
		target: 'ticket-subtasks',
		route: { path: '/$org/tickets/KS-2043' },
		placement: 'top',
	},
	{
		id: 'composer',
		chapter: 'detail',
		title: 'Reply to the client or leave a note',
		body: 'Replies go out on the channel the ticket came in on, WhatsApp here. Internal notes stay with the team and support @mentions, which notify the person.',
		target: 'ticket-composer',
		route: { path: '/$org/tickets/KS-2043' },
		placement: 'top',
	},
	{
		id: 'props',
		chapter: 'detail',
		title: 'Every property is editable',
		body: 'Assignee, priority, due date, story points, time logged, client, asset and SLA policy. Changes are logged in the Activity tab.',
		target: 'ticket-props',
		mobileTarget: 'm-props',
		route: { path: '/$org/tickets/KS-2043' },
		placement: 'left',
	},
	// My Work
	{
		id: 'mywork',
		chapter: 'mywork',
		title: 'Your personal queue',
		body: 'Assigned, mentioned, watching and created by you. Use J and K to move, Enter to open, A to assign. The Today card lists your visits and meetings.',
		target: 'mywork-list',
		mobileTarget: 'm-mywork',
		route: { path: '/$org/inbox' },
		placement: 'right',
	},
	// Projects
	{
		id: 'projects',
		chapter: 'projects',
		title: 'Software and service projects',
		body: 'Each project has an overview with epics and burndown, a scoped list and a board. Star the ones you work in most.',
		target: 'projects-list',
		route: { path: '/$org/projects' },
		placement: 'top',
	},
	{
		id: 'board',
		chapter: 'projects',
		title: 'Drag cards across the board',
		body: 'Columns map to workflow statuses with WIP limits. Drop a card to transition it; illegal moves are refused with the reason.',
		target: 'board',
		mobileTarget: 'm-board',
		route: { path: '/$org/projects/PB/board' },
		placement: 'top',
	},
	// Clients & assets
	{
		id: 'clients',
		chapter: 'clients',
		title: 'Accounts, contracts and health',
		body: 'MRR, renewals, retainer hours and a health score that blends SLA, CSAT and hours used. Open a client for contract terms, sites, contacts, invoices and notes.',
		target: 'clients-table',
		mobileTarget: 'm-clients',
		route: { path: '/$org/customers' },
		placement: 'top',
	},
	{
		id: 'assets',
		chapter: 'clients',
		title: 'Devices, licences and warranties',
		body: 'Every asset carries its QR label, history and open ticket. Raise a ticket straight from a device, import a CSV or print labels.',
		target: 'asset-panel',
		mobileTarget: 'm-assets',
		route: { path: '/$org/assets', search: { asset: 'LF-NET-0012' } },
		placement: 'left',
	},
	// Visits
	{
		id: 'dispatch',
		chapter: 'visits',
		title: 'Dispatch engineers',
		body: "Drag an unscheduled visit onto an engineer's timeline, or let Auto-route pick the least-loaded engineer per region. The map shows pins by priority.",
		target: 'visits-unscheduled',
		mobileTarget: 'm-visits',
		route: { path: '/$org/visits' },
		placement: 'right',
	},
	{
		id: 'timeline',
		chapter: 'visits',
		title: 'Follow the visit live',
		body: 'Checkpoints from dispatched to report, GPS check-in, parts that need client approval and a message-the-client button.',
		target: 'visits-timeline',
		mobileTarget: null,
		route: { path: '/$org/visits' },
		placement: 'top',
	},
	// Knowledge & reports
	{
		id: 'kb',
		chapter: 'knowledge',
		title: 'Knowledge base',
		body: 'Runbooks and playbooks for the team, public articles for the client portal. Search, categories, helpful votes and drafts.',
		target: 'kb-search',
		mobileTarget: 'm-kb',
		route: { path: '/$org/kb' },
		placement: 'bottom',
	},
	{
		id: 'reports',
		chapter: 'knowledge',
		title: 'Reports',
		body: 'Resolution versus SLA by priority, busy hours, engineer utilisation, categories and CSAT by client. Filter by range, client and region, export CSV or schedule a monthly email.',
		target: 'reports-chart',
		mobileTarget: 'm-reports',
		route: { path: '/$org/reports' },
		placement: 'top',
	},
	// Team & settings
	{
		id: 'team',
		chapter: 'admin',
		title: 'Your team',
		body: 'Invite agents and engineers, set roles and bases, see capacity. The roles matrix controls what each role can do.',
		target: 'team-table',
		mobileTarget: 'm-team',
		route: { path: '/$org/users' },
		placement: 'top',
	},
	{
		id: 'sla',
		chapter: 'admin',
		title: 'SLA policies and settings',
		body: 'Response and resolution targets per plan and priority, business hours, channels, automation rules, CSAT, billing and integrations. Changes apply immediately and are logged.',
		target: 'settings-sla',
		mobileTarget: 'm-settings',
		route: { path: '/$org/settings/sla' },
		placement: 'top',
	},
];

export const totalSteps = steps.length;

// ---------------------------------------------------------------------------
// Scripted video chapters (used when no real video URL is configured)

export type ScreenVariant =
	| 'welcome'
	| 'dashboard'
	| 'tickets'
	| 'detail'
	| 'board'
	| 'dispatch'
	| 'clients'
	| 'reports'
	| 'settings'
	| 'mobile'
	| 'end';

export interface VideoChapter {
	id: string;
	title: string;
	seconds: number;
	screen: ScreenVariant;
	captions: string[];
}

export const videoChapters: VideoChapter[] = [
	{
		id: 'welcome',
		title: 'Welcome to Ledge Desk',
		seconds: 14,
		screen: 'welcome',
		captions: [
			'Support tickets and project work, in one calm place.',
			'This three-minute tour shows how your team runs the helpdesk, field visits and delivery from one workspace.',
		],
	},
	{
		id: 'dashboard',
		title: 'The dashboard',
		seconds: 22,
		screen: 'dashboard',
		captions: [
			'Start your day with open tickets, first response time, SLA compliance and CSAT.',
			'Switch the period, refresh, export a CSV or raise a ticket from the header.',
			'Needs attention lists SLA breaches and unassigned P1s. Click one to open it in place.',
		],
	},
	{
		id: 'tickets',
		title: 'The helpdesk queue',
		seconds: 24,
		screen: 'tickets',
		captions: [
			'Tickets arrive from WhatsApp, email, phone and the portal into one queue.',
			'Status tabs with live counts, filters, saved views and a sort by SLA.',
			'Tick rows to assign, change status or priority in bulk. Countdowns update every few seconds.',
		],
	},
	{
		id: 'detail',
		title: 'Working a ticket',
		seconds: 26,
		screen: 'detail',
		captions: [
			'The workflow decides which statuses you can move to. Waiting on client pauses the clock.',
			'Reply on the channel the client used, or leave an internal note with @mentions.',
			'Sub-tasks, linked issues, labels, attachments and every property edit inline.',
		],
	},
	{
		id: 'projects',
		title: 'Projects and boards',
		seconds: 20,
		screen: 'board',
		captions: [
			'Software teams run sprints on a board with WIP limits and drag-and-drop transitions.',
			'Overviews roll up epics, burndown and status distribution per project.',
		],
	},
	{
		id: 'dispatch',
		title: 'Field visits',
		seconds: 22,
		screen: 'dispatch',
		captions: [
			'Drag unscheduled visits onto engineer timelines, or auto-route by region.',
			'Track dispatched, en route, on site and report with GPS check-in and parts approval.',
		],
	},
	{
		id: 'clients',
		title: 'Clients and assets',
		seconds: 22,
		screen: 'clients',
		captions: [
			'Accounts carry contract terms, SLA, retainer hours, invoices and a health score.',
			'Assets have QR labels, warranties, firmware and history. Raise a ticket from any device.',
		],
	},
	{
		id: 'reports',
		title: 'Reports and knowledge',
		seconds: 20,
		screen: 'reports',
		captions: [
			'Resolution versus SLA, busy hours, utilisation and CSAT by client, exportable or scheduled monthly.',
			'Runbooks for the team and public articles for the client portal live in the knowledge base.',
		],
	},
	{
		id: 'settings',
		title: 'Team and settings',
		seconds: 18,
		screen: 'settings',
		captions: [
			'Invite people, set roles and bases, and tune SLA policies, channels, automation and billing.',
			'Everything is logged to the audit trail and applies immediately.',
		],
	},
	{
		id: 'mobile',
		title: 'On the road',
		seconds: 16,
		screen: 'mobile',
		captions: [
			'Engineers get the same tickets, visits and notes on their phone, offline-first with sync.',
			'Press ⌘K anywhere to search or run an action.',
		],
	},
	{
		id: 'end',
		title: 'You are ready',
		seconds: 10,
		screen: 'end',
		captions: [
			'Take the interactive tour to try each screen yourself, or dive straight in.',
		],
	},
];

export const videoTotalSeconds = videoChapters.reduce(
	(s, c) => s + c.seconds,
	0,
);
