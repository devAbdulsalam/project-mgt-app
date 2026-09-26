import { statusCategory, transitions } from '@/mocks/seed';
import type { AutomationRule, BoardConfig, Priority, Project, ProjectIntegration, ProjectNotificationRule, ProjectSettings, Status, TicketType, WorkflowTransition } from '@/mocks/types';

export const projectSettingsSections = [
	['general', 'General'],
	['workflow', 'Workflow'],
	['fields', 'Fields'],
	['boards', 'Boards'],
	['types', 'Ticket types'],
	['members', 'Members & roles'],
	['automation', 'Automation'],
	['notifications', 'Notifications'],
	['integrations', 'Integrations'],
	['danger', 'Danger zone'],
] as const;
export type ProjectSettingsSection = (typeof projectSettingsSections)[number][0];
export const isSection = (s: string): s is ProjectSettingsSection => projectSettingsSections.some(([k]) => k === s);
export const sectionLabel = (s: string) => projectSettingsSections.find(([k]) => k === s)?.[1] ?? 'Settings';

export const validatorCatalog = ['Assignee is set', 'All sub-tasks are done', 'No open "is blocked by" links', 'Resolution comment added', 'Reviewer is not the assignee', 'Client approval recorded', 'Visit report attached'];
export const postFunctionCatalog = ['Notify reporter & watchers', 'Stop SLA timer', 'Start SLA timer', 'Post to Slack channel', 'Set resolution = Fixed', 'Publish to client portal', 'Clear assignee'];
export const roleOptions = ['Members, Project admins', 'Project admins', 'Reviewers, Project admins', 'Field engineers, Dispatch', 'Anyone'];

export const softwareStatuses: Status[] = ['Open', 'In progress', 'In review', 'Blocked', 'Resolved', 'Closed'];
export const serviceStatuses: Status[] = ['New', 'Open', 'Scheduled', 'Dispatched', 'In progress', 'Waiting on client', 'Awaiting vendor', 'Blocked', 'Resolved', 'Closed'];

export function transitionName(from: Status, to: Status) {
	if (to === 'In progress') return from === 'Blocked' ? 'Unblock' : from === 'In review' ? 'Request changes' : 'Start work';
	if (to === 'In review') return 'Review';
	if (to === 'Resolved') return 'Resolve';
	if (to === 'Closed') return 'Close';
	if (to === 'Blocked') return 'Block';
	if (to === 'Open') return statusCategory[from] === 'done' ? 'Reopen' : 'Back to open';
	if (to === 'Dispatched') return 'Dispatch';
	if (to === 'Scheduled') return 'Schedule visit';
	if (to === 'Waiting on client') return 'Wait on client';
	if (to === 'Awaiting vendor') return 'Wait on vendor';
	return `Move to ${to}`;
}

export const transitionId = (from: Status, to: Status) => `${from}>${to}`;

export function defaultTransitions(statuses: Status[]): WorkflowTransition[] {
	const set = new Set(statuses);
	return statuses.flatMap((from) =>
		transitions[from]
			.filter((to) => set.has(to))
			.map((to) => ({
				id: transitionId(from, to),
				from,
				to,
				name: transitionName(from, to),
				roles: to === 'Resolved' || to === 'Closed' ? 'Reviewers, Project admins' : to === 'Dispatched' ? 'Field engineers, Dispatch' : 'Members, Project admins',
				validators: to === 'Resolved' ? ['All sub-tasks are done', 'No open "is blocked by" links'] : to === 'In progress' ? ['Assignee is set'] : to === 'In review' ? ['Reviewer is not the assignee'] : [],
				postFunctions: to === 'Resolved' ? ['Notify reporter & watchers', 'Stop SLA timer'] : to === 'In progress' ? ['Start SLA timer'] : to === 'Dispatched' ? ['Notify reporter & watchers'] : [],
			})),
	);
}

function defaultBoards(p: Project): BoardConfig[] {
	const col = (id: string, name: string, statuses: Status[], wip?: number) => ({ id, name, statuses, wip });
	if (p.kind === 'software') {
		return [
			{ id: 'b_main', name: `${p.name} board`, type: 'scrum', swimlane: 'none', isDefault: true, columns: [col('todo', 'To do', ['New', 'Open', 'Scheduled']), col('progress', 'In progress', ['In progress', 'Dispatched'], 3), col('review', 'In review', ['In review']), col('blocked', 'Blocked', ['Blocked', 'Waiting on client', 'Awaiting vendor']), col('done', 'Done', ['Resolved', 'Closed'])] },
			{ id: 'b_bugs', name: 'Bug triage', type: 'kanban', swimlane: 'priority', isDefault: false, columns: [col('new', 'New', ['New', 'Open']), col('progress', 'Fixing', ['In progress', 'In review']), col('done', 'Fixed', ['Resolved', 'Closed'])] },
		];
	}
	return [
		{ id: 'b_main', name: 'Service queue', type: 'kanban', swimlane: 'assignee', isDefault: true, columns: [col('new', 'New / Open', ['New', 'Open']), col('scheduled', 'Scheduled', ['Scheduled']), col('progress', 'In progress', ['In progress', 'Dispatched'], 6), col('waiting', 'Waiting', ['Waiting on client', 'Awaiting vendor']), col('blocked', 'Blocked', ['Blocked', 'In review']), col('done', 'Resolved', ['Resolved', 'Closed'])] },
	];
}

function defaultAutomation(p: Project): AutomationRule[] {
	if (p.kind === 'software') {
		return [
			{ id: 'r1', name: 'Auto-assign accessibility issues', trigger: 'Issue created', condition: 'label = a11y', action: 'Assign to Uche Nnaji', enabled: true, runs: 14 },
			{ id: 'r2', name: 'Nudge stale reviews', trigger: 'Daily at 09:00', condition: 'status = In review for more than 2 days', action: 'Comment and mention assignee', enabled: true, runs: 31 },
			{ id: 'r3', name: 'Close resolved after 7 days', trigger: 'Daily at 09:00', condition: 'status = Resolved for more than 7 days', action: 'Transition to Closed', enabled: false, runs: 0 },
		];
	}
	return [
		{ id: 'r1', name: 'Assign by asset site', trigger: 'Issue created', condition: 'asset site is set', action: 'Assign to the site engineer', enabled: true, runs: 118 },
		{ id: 'r2', name: 'Escalate P1 at 75% of SLA', trigger: 'SLA at 75%', condition: 'priority = P1', action: 'Notify lead via WhatsApp', enabled: true, runs: 9 },
		{ id: 'r3', name: 'WhatsApp client on dispatch', trigger: 'Status changed', condition: 'status = Dispatched', action: 'Send WhatsApp template "Engineer on the way"', enabled: true, runs: 64 },
	];
}

function defaultNotifications(p: Project): ProjectNotificationRule[] {
	const base: ProjectNotificationRule[] = [
		{ event: 'issue.created', label: 'Issue created in this project', inApp: true, email: false, whatsapp: false },
		{ event: 'issue.assigned', label: 'Issue assigned to me', inApp: true, email: true, whatsapp: false },
		{ event: 'status.changed', label: 'Status changed on an issue I watch', inApp: true, email: false, whatsapp: false },
		{ event: 'comment.mention', label: 'Someone mentions me', inApp: true, email: true, whatsapp: true },
		{ event: 'due.soon', label: 'Due date within 24 hours', inApp: true, email: true, whatsapp: false },
		{ event: 'sla.risk', label: 'SLA at risk or breached', inApp: true, email: true, whatsapp: true },
	];
	return p.kind === 'software' ? [...base, { event: 'sprint.events', label: 'Sprint started or completed', inApp: true, email: true, whatsapp: false }] : base;
}

function defaultIntegrations(p: Project): ProjectIntegration[] {
	if (p.kind === 'software') {
		return [
			{ id: 'github', name: 'GitHub', description: 'Link commits and pull requests; auto-transition on merge.', connected: true, detail: `kolanut/${p.key.toLowerCase()} · 3 open PRs linked` },
			{ id: 'gitlab', name: 'GitLab', description: 'Merge request links and pipeline status on issues.', connected: false },
			{ id: 'slack', name: 'Slack', description: 'Post issue events to a channel and create issues from Slack.', connected: true, detail: `#${p.key.toLowerCase()}-dev` },
			{ id: 'gcal', name: 'Google Calendar', description: 'Sync sprint dates and due dates to a shared calendar.', connected: false },
		];
	}
	return [
		{ id: 'whatsapp', name: 'WhatsApp Business', description: 'Client conversations become tickets; dispatch templates.', connected: true, detail: '+234 1 700 0000 · 12 templates approved' },
		{ id: 'slack', name: 'Slack', description: 'Escalations and SLA alerts to a channel.', connected: false },
		{ id: 'gcal', name: 'Google Calendar', description: 'Sync scheduled visits to engineer calendars.', connected: true, detail: 'Field · Lagos, Field · Abuja' },
		{ id: 'zoho', name: 'Zoho Books', description: 'Push billable hours and parts to invoices.', connected: false },
	];
}

export function defaultProjectSettings(p: Project): ProjectSettings {
	const statuses = p.kind === 'software' ? softwareStatuses : serviceStatuses;
	const types: TicketType[] = ['task', 'bug', 'story', 'epic', 'subtask', 'support'];
	const enabled: Record<TicketType, boolean> = p.kind === 'software' ? { task: true, bug: true, story: true, epic: true, subtask: true, support: false } : { task: true, bug: false, story: false, epic: false, subtask: true, support: true };
	const defaultPriority: Record<TicketType, Priority> = { task: 'P3', bug: 'P2', story: 'P3', epic: 'P3', subtask: 'P4', support: 'P2' };
	return {
		general: { defaultAssignee: p.kind === 'software' ? 'unassigned' : 'round-robin', visibility: 'org', startDay: 'monday', workingDays: p.kind === 'service' ? 6 : 5, focusHoursPerDay: 6, clientVisible: p.kind === 'service' },
		workflow: { name: p.kind === 'software' ? 'Software default' : 'Service desk default', statuses: statuses.map((s) => ({ status: s, category: statusCategory[s], wipLimit: s === 'In progress' ? (p.kind === 'software' ? 3 : 6) : undefined, note: s === 'Blocked' ? 'Requires reason' : s === 'In review' ? 'Assignee ≠ reviewer' : undefined })), transitions: defaultTransitions(statuses), publishedAt: p.createdAt },
		fields:
			p.kind === 'software'
				? [
						{ id: 'f_env', name: 'Environment', type: 'select', required: false, options: ['Production', 'Staging', 'Local'], appliesTo: ['bug'], description: 'Where the bug was seen' },
						{ id: 'f_reviewer', name: 'Reviewer', type: 'user', required: true, appliesTo: ['task', 'bug', 'story'] },
						{ id: 'f_points', name: 'Confidence', type: 'number', required: false, appliesTo: ['story'], description: '1–5 estimate confidence' },
					]
				: [
						{ id: 'f_site', name: 'Site contact', type: 'text', required: true, appliesTo: ['support', 'task'] },
						{ id: 'f_parts', name: 'Parts needed', type: 'checkbox', required: false, appliesTo: ['support'] },
						{ id: 'f_window', name: 'Visit window', type: 'select', required: false, options: ['Morning', 'Afternoon', 'After hours'], appliesTo: ['support', 'task'] },
					],
		boards: defaultBoards(p),
		ticketTypes: types.map((type) => ({ type, enabled: enabled[type], defaultPriority: defaultPriority[type], template: type === 'bug' ? 'Steps to reproduce:\n1.\n\nExpected:\n\nActual:' : type === 'support' ? 'Site:\nAffected users:\nSince when:' : '' })),
		roles: { [p.leadId]: 'Admin' },
		automation: defaultAutomation(p),
		notifications: defaultNotifications(p),
		integrations: defaultIntegrations(p),
	};
}

/** Stored settings layered over defaults so old persisted projects keep working. */
export function resolveSettings(p: Project): ProjectSettings {
	const d = defaultProjectSettings(p);
	return p.settings ? { ...d, ...p.settings, general: { ...d.general, ...p.settings.general } } : d;
}

export const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
