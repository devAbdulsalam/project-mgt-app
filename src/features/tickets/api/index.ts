// Tickets API adapter — the live-API seam for the tickets module (frontend plan §4.2).
// Defaults to the mock DB until the module flips via VITE_USE_LIVE_API / useLiveApi().

export type { TicketScope } from './queryKeys';
export { uploadFile, deleteAttachment, attachToTicket, uploadPolicies } from './uploads';
export type { UploadOptions, UploadPurpose } from './uploads';
export type {
	CommentPayload,
	CreateTicketPayload,
	TicketActivityDto,
	TicketAttachmentDto,
	UploadPolicyDto,
	TicketCommentDto,
	TicketDto,
	TicketPage,
	TicketCounts,
	TicketLinkDto,
	TicketListParams,
	TicketSlaDto,
	TicketSubtaskDto,
	TransitionPayload,
	UpdateTicketPayload,
	UserRefDto,
	ClientRefDto,
} from './contracts';
export { ticketKeys } from './queryKeys';
export { ticketListQuery, ticketCountsQuery, ticketDetailQuery, ticketDtoQuery, toListQuery } from './queries';
export type { TicketListResult } from './queries';
export { createTicketMutation, updateTicketMutation, transitionMutation, addCommentMutation, deleteTicketMutation } from './mutations';
export type { AddCommentInput, TransitionInput, UpdateTicketInput } from './mutations';
export { ticketDtoToDomain, createTicketToPayload, attachmentDtoToDomain, formatBytes } from './mapper';