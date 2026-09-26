// Uploading files to the API.
//
// The one place in the app that does not go through ApiClient, and for one
// reason: `fetch` cannot report upload progress. It resolves when the response
// arrives, which for a 20 MB file on site Wi-Fi is a progress bar that sits at
// nothing and then jumps to done. XMLHttpRequest still has `upload.onprogress`,
// so it is what this uses. Everything else — the bearer token, the base URL,
// the problem+json error shape — is kept identical to the rest of the client.
//
// Uploads are staged, not attached: the server stores the bytes, returns ids,
// and nothing owns them until the ticket is created with those ids. That is
// what lets the Create-ticket dialog upload while the form is still being
// filled in without inventing a draft ticket to hang them on.

import { API_BASE_URL, ApiError, api } from '@/api';
import { getAccessToken } from '@/shared/lib/token-store';
import type { TicketAttachmentDto, UploadPolicyDto } from './contracts';

export type UploadPurpose = 'ticket_attachment' | 'comment_attachment' | 'client_document' | 'avatar' | 'org_logo';

export interface UploadOptions {
	/** 0–1, called as the bytes go out. */
	onProgress?: (fraction: number) => void;
	signal?: AbortSignal;
}

/**
 * Sends one file and resolves with the stored attachment.
 *
 * One request per file rather than one for all of them: a 422 on the fourth
 * file would otherwise discard the three that were fine, and a per-file
 * progress bar cannot be drawn from a single combined upload.
 */
export function uploadFile(
	org: string,
	file: File,
	purpose: UploadPurpose,
	options: UploadOptions = {},
): Promise<TicketAttachmentDto> {
	return new Promise((resolve, reject) => {
		const form = new FormData();
		form.append('file', file, file.name);

		const request = new XMLHttpRequest();
		request.open('POST', `${API_BASE_URL}/orgs/${org}/uploads?purpose=${purpose}`);
		request.setRequestHeader('Accept', 'application/json');

		const token = getAccessToken();
		if (token) request.setRequestHeader('Authorization', `Bearer ${token}`);

		request.upload.onprogress = (event) => {
			if (event.lengthComputable) options.onProgress?.(event.loaded / event.total);
		};

		request.onload = () => {
			const problem = parseBody(request.responseText);

			if (request.status >= 200 && request.status < 300) {
				const attachment = (problem as { data?: TicketAttachmentDto[] })?.data?.[0];
				if (attachment) {
					resolve(attachment);
					return;
				}
				reject(new ApiError({ status: request.status, code: 'malformed_response', message: 'The upload did not return a file.' }));
				return;
			}

			reject(toApiError(request.status, problem));
		};

		// A dropped connection and a cancelled upload are different outcomes: one
		// is worth showing, the other is what the person just asked for.
		request.onerror = () =>
			reject(new ApiError({ status: 0, code: 'network_error', message: 'The upload could not reach the server.' }));
		request.onabort = () => reject(new ApiError({ status: 0, code: 'upload_cancelled', message: 'Upload cancelled.' }));
		request.ontimeout = () =>
			reject(new ApiError({ status: 0, code: 'timeout', message: 'The upload timed out.' }));

		options.signal?.addEventListener('abort', () => request.abort(), { once: true });

		request.send(form);
	});
}

/** Removes a staged or attached file, and its bytes, server-side. */
export function deleteAttachment(org: string, attachmentId: string): Promise<void> {
	return api.del<void>(`/orgs/${org}/attachments/${attachmentId}`);
}

/** Attaches already-staged uploads to a ticket that exists. */
export function attachToTicket(org: string, ticketKey: string, attachmentIds: string[]): Promise<{ data: TicketAttachmentDto[] }> {
	return api.post<{ data: TicketAttachmentDto[] }>(`/orgs/${org}/tickets/${ticketKey}/attachments`, {
		json: { attachment_ids: attachmentIds },
	});
}

export function uploadPolicies(org: string): Promise<{ data: UploadPolicyDto[] }> {
	return api.get<{ data: UploadPolicyDto[] }>(`/orgs/${org}/uploads/policies`);
}

function parseBody(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

function toApiError(status: number, body: unknown): ApiError {
	const problem = (body ?? {}) as {
		status?: number;
		code?: string;
		title?: string;
		detail?: string;
		field_errors?: Record<string, string[]>;
	};

	return new ApiError({
		status: problem.status ?? status,
		code: problem.code ?? `HTTP_${status}`,
		message: problem.detail ?? problem.title ?? `Upload failed (${status})`,
		detail: problem.detail,
		fieldErrors: problem.field_errors,
	});
}
