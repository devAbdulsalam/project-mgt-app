// Wire types for the tickets API.
//
// snake_case throughout, matching the backend (its DECISIONS.md D3). The app's
// domain types in src/mocks/types.ts stay camelCase with epoch-millisecond
// timestamps; mapper.ts is the single place the two meet.

import type { Attachment, Channel, Impact, Priority, TicketLink } from '@/mocks/types';

/** Status values as stored, not as displayed. mapper.ts renders the labels. */
export type WireStatus =
	| 'new'
	| 'open'
	| 'in_progress'
	| 'dispatched'
	| 'scheduled'
	| 'waiting_on_client'
	| 'awaiting_vendor'
	| 'in_review'
	| 'blocked'
	| 'resolved'
	| 'closed';

export type WirePriority = 'p1' | 'p2' | 'p3' | 'p4';
export type WireType = 'task' | 'bug' | 'story' | 'epic' | 'subtask' | 'support';
export type WireImpact = 's1' | 's2' | 's3' | 's4';

export interface TicketCommentDto {
	id: string;
	author_id: string | null;
	author_name: string | null;
	body: string;
	internal: boolean;
	channel: Channel | null;
	from_client: boolean;
	mentions: string[];
	edited_at: string | null;
	created_at: string;
}

export interface TicketActivityDto {
	id: string;
	actor_id: string | null;
	actor_name: string | null;
	verb: string;
	text: string;
	data: Record<string, unknown>;
	system: boolean;
	created_at: string;
}

export interface TicketSubtaskDto {
	id: string;
	key: string;
	title: string;
	status: WireStatus;
	assignee_id: string | null;
}

export interface TicketLinkDto {
	id: string;
	type: string;
	ticket_id: string;
	key: string;
	title: string;
	status: WireStatus;
}

/**
 * A stored file.
 *
 * `url` is signed and expires at `url_expires_at` — it is minted per response,
 * so a payload that has been sitting in a cache for an hour has stale links and
 * should be refetched rather than retried.
 */
export interface TicketAttachmentDto {
	id: string;
	purpose: string;
	filename: string;
	content_type: string;
	byte_size: number;
	/** image | document | spreadsheet | presentation | text | video | audio | archive */
	kind: string;
	checksum_sha256: string;
	metadata: Record<string, unknown>;
	scan_status: 'clean' | 'infected' | 'failed' | 'skipped' | 'pending';
	ticket_id: string | null;
	comment_id: string | null;
	uploaded_by: string | null;
	uploaded_by_name: string | null;
	created_at: string;
	url: string;
	url_expires_at: string;
}

/** What each upload purpose accepts. Read from the API, never hard-coded. */
export interface UploadPolicyDto {
	purpose: string;
	max_files: number;
	max_bytes: number;
	accepted_types: string[];
	accepted_extensions: string[];
	scanned: boolean;
	visibility: 'public' | 'private';
}

export interface TicketSlaDto {
	policy: string | null;
	response_due_at: string | null;
	resolve_due_at: string | null;
	/** Derived server-side on every read — never a stored column. */
	breached: boolean;
	at_risk: boolean;
	paused: boolean;
}

export interface UserRefDto {
	id: string;
	name: string | null;
	email: string | null;
}

export interface ClientRefDto {
	id: string;
	name: string | null;
}

export interface TicketDto {
	id: string;
	key: string;
	seq: number;
	project_id: string;
	project_key: string | null;

	title: string;
	description: string | null;
	category: string | null;

	type: WireType;
	priority: WirePriority;
	status: WireStatus;
	status_category: 'todo' | 'in_progress' | 'done';
	channel: Channel;
	impact: WireImpact | null;

	client_id: string | null;
	site: string | null;
	asset_id: string | null;

	assignee_id: string | null;
	reporter: { id: string | null; name: string | null; is_client: boolean };

	labels: string[];
	watcher_ids: string[];

	parent_id: string | null;
	epic_id: string | null;
	sprint_id: string | null;
	story_points: number | null;
	time_estimate_min: number | null;
	time_logged_min: number;
	rank: number;

	sla: TicketSlaDto | null;
	fields: Record<string, unknown>;

	due_at: string | null;
	resolved_at: string | null;
	created_at: string;
	updated_at: string;

	/** Send this back on every mutation; a stale value is refused with 409. */
	version: number;

	// Present only when ?include= asked for them.
	assignee?: UserRefDto | null;
	client?: ClientRefDto | null;
	comments?: TicketCommentDto[];
	activity?: TicketActivityDto[];
	subtasks?: TicketSubtaskDto[];
	links?: TicketLinkDto[];
	attachments?: TicketAttachmentDto[];

	meta?: { transitions: { to: WireStatus; name: string }[] };
}

/** Keyset pagination: pass `next_cursor` back as `cursor`. */
export interface TicketPage {
	data: TicketDto[];
	next_cursor: string | null;
	prev_cursor: string | null;
	/** Size of the whole filtered set, not just this page. */
	total: number;
}

export interface TicketCounts {
	open: number;
	unassigned: number;
	mine: number;
	waiting: number;
	risk: number;
	resolved: number;
	all: number;
}

export interface TicketListParams {
	tab?: string;
	q?: string;
	priority?: WirePriority[];
	type?: WireType[];
	channel?: Channel[];
	status?: WireStatus[];
	client_id?: string;
	assignee?: string;
	project?: string;
	label?: string;
	sort?: string;
	cursor?: string;
	limit?: number;
	include?: string;
}

export interface CreateTicketPayload {
	title: string;
	description?: string;
	category?: string;
	type?: WireType;
	priority?: WirePriority;
	channel?: Channel;
	impact?: WireImpact;
	client_id?: string;
	site?: string;
	assignee_id?: string;
	labels?: string[];
	due_at?: string;
	story_points?: number;
	/**
	 * Files staged through POST /uploads before this ticket existed. The server
	 * claims them as part of creating it, and refuses the whole create if they
	 * cannot be claimed — so the person never gets a ticket missing the evidence
	 * they attached.
	 */
	attachment_ids?: string[];
}

export interface UpdateTicketPayload {
	version: number;
	title?: string;
	description?: string | null;
	priority?: WirePriority;
	assignee_id?: string | null;
	labels?: string[];
	due_at?: string | null;
	story_points?: number | null;
}

export interface TransitionPayload {
	to: WireStatus;
	version: number;
	comment?: string;
}

export interface CommentPayload {
	body: string;
	internal: boolean;
	channel?: Channel;
}

export type { Attachment, Impact, Priority, TicketLink };
