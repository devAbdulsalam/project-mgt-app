// The boundary between the wire and the app.
//
// Backend: snake_case fields, snake_case enum VALUES, ISO-8601 timestamps.
// App:     camelCase fields, display LABELS, epoch-millisecond timestamps.
//
// Everything that differs between the two is translated here and nowhere else,
// so a component never has to know which side a value came from.

import type { Attachment, Channel, Impact, Priority, Status, Ticket, Comment, Activity, Subtask, TicketLink } from '@/mocks/types';
import type {
	CreateTicketPayload,
	TicketAttachmentDto,
	TicketActivityDto,
	TicketCommentDto,
	TicketDto,
	TicketLinkDto,
	TicketSubtaskDto,
	WireImpact,
	WirePriority,
	WireStatus,
} from './contracts';

// -- Value maps -------------------------------------------------------------
//
// The database stores values; the UI shows labels. Keeping labels out of the
// database is what lets them be renamed or translated without a migration.

const STATUS_LABEL: Record<WireStatus, Status> = {
	new: 'New',
	open: 'Open',
	in_progress: 'In progress',
	dispatched: 'Dispatched',
	scheduled: 'Scheduled',
	waiting_on_client: 'Waiting on client',
	awaiting_vendor: 'Awaiting vendor',
	in_review: 'In review',
	blocked: 'Blocked',
	resolved: 'Resolved',
	closed: 'Closed',
};

const STATUS_VALUE = Object.fromEntries(
	Object.entries(STATUS_LABEL).map(([value, label]) => [label, value]),
) as Record<Status, WireStatus>;

const PRIORITY_LABEL: Record<WirePriority, Priority> = { p1: 'P1', p2: 'P2', p3: 'P3', p4: 'P4' };
const PRIORITY_VALUE = { P1: 'p1', P2: 'p2', P3: 'p3', P4: 'p4' } as const;

const IMPACT_LABEL: Record<WireImpact, Impact> = {
	s1: 'S1 · Branch down',
	s2: 'S2 · Degraded',
	s3: 'S3 · Single user',
	s4: 'S4 · Cosmetic',
};

const IMPACT_VALUE = Object.fromEntries(
	Object.entries(IMPACT_LABEL).map(([value, label]) => [label, value]),
) as Record<Impact, WireImpact>;

const LINK_LABEL: Record<string, TicketLink['type']> = {
	blocks: 'blocks',
	blocked_by: 'is blocked by',
	duplicates: 'duplicates',
	duplicated_by: 'duplicates',
	relates_to: 'relates to',
	causes: 'relates to',
	caused_by: 'relates to',
};

export const statusToWire = (status: Status): WireStatus => STATUS_VALUE[status];
export const statusToLabel = (status: WireStatus): Status => STATUS_LABEL[status] ?? 'Open';
export const priorityToWire = (priority: Priority): WirePriority => PRIORITY_VALUE[priority];

// -- Time -------------------------------------------------------------------
//
// The app compares and formats timestamps as numbers everywhere, so ISO strings
// are parsed once, here.

const ms = (iso: string | null | undefined): number | undefined => {
	if (!iso) return undefined;
	const value = Date.parse(iso);
	return Number.isNaN(value) ? undefined : value;
};

const msRequired = (iso: string): number => ms(iso) ?? 0;

// -- Records ----------------------------------------------------------------

export function commentToDomain(dto: TicketCommentDto): Comment {
	return {
		id: dto.id,
		authorId: dto.author_id ?? undefined,
		authorName: dto.author_name ?? 'Someone',
		body: dto.body,
		internal: dto.internal,
		at: msRequired(dto.created_at),
		channel: (dto.channel ?? undefined) as Channel | undefined,
		fromClient: dto.from_client,
	};
}

export function activityToDomain(dto: TicketActivityDto): Activity {
	return {
		id: dto.id,
		at: msRequired(dto.created_at),
		// The backend stores the predicate ("changed priority"); the UI shows a
		// whole sentence, so the actor is prefixed here.
		actorName: dto.actor_name ?? 'Someone',
		text: dto.text,
		system: dto.system,
	};
}

export function subtaskToDomain(dto: TicketSubtaskDto): Subtask {
	return {
		key: dto.key,
		title: dto.title,
		done: dto.status === 'resolved' || dto.status === 'closed',
		assigneeId: dto.assignee_id ?? undefined,
	};
}

export function linkToDomain(dto: TicketLinkDto): TicketLink {
	return { type: LINK_LABEL[dto.type] ?? 'relates to', key: dto.key };
}

/** The whole ticket, wire shape to domain shape. */
export function ticketDtoToDomain(dto: TicketDto): Ticket {
	return {
		key: dto.key,
		projectKey: dto.project_key ?? dto.key.split('-')[0],
		title: dto.title,
		category: dto.category ?? '',
		type: dto.type,
		priority: PRIORITY_LABEL[dto.priority] ?? 'P3',
		status: statusToLabel(dto.status),
		channel: dto.channel,
		clientId: dto.client_id ?? undefined,
		site: dto.site ?? undefined,
		assigneeId: dto.assignee_id ?? undefined,
		reporter: {
			id: dto.reporter?.id ?? undefined,
			name: dto.reporter?.name ?? 'Unknown',
			isClient: dto.reporter?.is_client ?? false,
		},
		labels: dto.labels ?? [],
		description: dto.description ?? '',
		createdAt: msRequired(dto.created_at),
		updatedAt: msRequired(dto.updated_at),
		resolvedAt: ms(dto.resolved_at),
		dueAt: ms(dto.due_at),
		sla: dto.sla?.resolve_due_at
			? {
					policy: dto.sla.policy ?? 'standard',
					// The backend sends deadlines, not targets; the UI only needs the
					// deadline to colour the row, so the target is left at zero rather
					// than invented here.
					responseTargetMin: 0,
					resolveDueAt: ms(dto.sla.resolve_due_at) ?? 0,
					resolveTargetLabel: dto.sla.breached ? 'Breached' : dto.sla.at_risk ? 'At risk' : 'On track',
				}
			: undefined,
		epicId: dto.epic_id ?? undefined,
		sprint: dto.sprint_id ?? undefined,
		storyPoints: dto.story_points ?? undefined,
		timeLoggedMin: dto.time_logged_min ?? 0,
		timeEstimateMin: dto.time_estimate_min ?? undefined,
		asset: dto.asset_id ?? undefined,
		impact: dto.impact ? IMPACT_LABEL[dto.impact] : undefined,
		subtasks: (dto.subtasks ?? []).map(subtaskToDomain),
		links: (dto.links ?? []).map(linkToDomain),
		comments: (dto.comments ?? []).map(commentToDomain),
		activity: (dto.activity ?? []).map(activityToDomain),
		attachments: (dto.attachments ?? []).map(attachmentDtoToDomain),
		watcherIds: dto.watcher_ids ?? [],
		mentionedIds: (dto.comments ?? []).flatMap((c) => c.mentions ?? []),
		createdById: dto.reporter?.id ?? undefined,
	};
}

/**
 * The server's file groups collapsed into the four the UI draws icons for.
 *
 * A spreadsheet and a presentation get the document icon because the list shows
 * the filename underneath; inventing two more icons would add no information.
 */
const ATTACHMENT_KIND: Record<string, Attachment['kind']> = {
	image: 'image',
	text: 'log',
	document: 'pdf',
	spreadsheet: 'pdf',
	presentation: 'pdf',
	video: 'other',
	audio: 'other',
	archive: 'other',
};

/** Bytes as a person reads them. The server sends the number; this is the label. */
export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) return '—';
	if (bytes < 1024) return `${bytes} B`;

	const units = ['KB', 'MB', 'GB'];
	let value = bytes / 1024;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit++;
	}
	return `${value >= 10 || Number.isInteger(value) ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

export function attachmentDtoToDomain(dto: TicketAttachmentDto): Attachment {
	return {
		id: dto.id,
		name: dto.filename,
		size: formatBytes(dto.byte_size),
		kind: ATTACHMENT_KIND[dto.kind] ?? 'other',
		bytes: dto.byte_size,
		contentType: dto.content_type,
		url: dto.url,
		scanStatus: dto.scan_status === 'pending' ? undefined : dto.scan_status,
	};
}

/** Domain values back to the wire, for a create form. */
export function createTicketToPayload(input: {
	title: string;
	description?: string;
	category?: string;
	type?: Ticket['type'];
	priority?: Priority;
	channel?: Channel;
	impact?: Impact;
	clientId?: string;
	site?: string;
	assigneeId?: string;
	labels?: string[];
	dueAt?: number;
	storyPoints?: number;
	attachmentIds?: string[];
}): CreateTicketPayload {
	return {
		title: input.title,
		description: input.description,
		category: input.category,
		type: input.type,
		priority: input.priority ? priorityToWire(input.priority) : undefined,
		channel: input.channel,
		impact: input.impact ? IMPACT_VALUE[input.impact] : undefined,
		client_id: input.clientId,
		site: input.site,
		assignee_id: input.assigneeId,
		labels: input.labels,
		due_at: input.dueAt ? new Date(input.dueAt).toISOString() : undefined,
		story_points: input.storyPoints,
		attachment_ids: input.attachmentIds?.length ? input.attachmentIds : undefined,
	};
}
