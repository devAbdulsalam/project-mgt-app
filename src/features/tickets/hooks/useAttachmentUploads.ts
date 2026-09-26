// Files chosen in a form, on their way to a ticket that may not exist yet.
//
// One hook, two data sources, like the rest of this module:
//
//   live  each file is uploaded as it is chosen, to POST /uploads, which stores
//         the bytes and returns an id. Nothing owns them yet. The ids go with
//         the create call and the server claims them; anything the person
//         removed, or never submitted, is deleted.
//   mock  the file stays in the browser behind an object URL, so the dialog
//         behaves identically on demo data.
//
// Uploading as the file is chosen rather than on submit is what makes the wait
// invisible: by the time the summary and the description are typed, a 12 MB
// photo of a rack is already stored. The cost is that removing a file has to
// delete something server-side, which `remove` does.
//
// Limits come from the API (`/uploads/policies`), not from a constant in a
// dialog, so tightening them is a deployment change rather than a release of
// two codebases that have to agree.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/api';
import { isLiveApi } from '@/shared/lib/live-api';
import { useAuthStore } from '@/shared/lib/auth-store';
import { toast } from '@/shared/lib/toast-store';
import type { Attachment } from '@/mocks/types';
import { attachmentDtoToDomain, formatBytes } from '../api/mapper';
import { deleteAttachment, uploadFile, uploadPolicies, type UploadPurpose } from '../api/uploads';

export interface UploadItem {
	/** Stable key for React and for removal. Not the server's id. */
	localId: string;
	name: string;
	/** Human-readable size, for display. */
	size: string;
	bytes: number;
	kind: Attachment['kind'];
	status: 'uploading' | 'ready' | 'error';
	/** 0–1 while uploading. */
	progress: number;
	error?: string;
	/** Present once the server has stored it. */
	attachmentId?: string;
	url?: string;
	scanStatus?: Attachment['scanStatus'];
}

export interface UploadPolicy {
	maxFiles: number;
	maxBytes: number;
	/** For the file input's `accept`, and for the client-side pre-check. */
	extensions: string[];
	scanned: boolean;
}

/**
 * What the dialog assumes before the API has told it otherwise.
 *
 * Deliberately a copy of the server's `ticket_attachment` policy rather than a
 * looser guess: being optimistic here would mean accepting a file in the UI and
 * having it refused on upload, which reads as a bug.
 */
export const DEFAULT_UPLOAD_POLICY: UploadPolicy = {
	maxFiles: 10,
	maxBytes: 25 * 1024 * 1024,
	extensions: [
		'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'heic', 'heif', 'bmp', 'tif', 'tiff',
		'pdf', 'docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt', 'odt', 'ods',
		'txt', 'log', 'csv', 'json',
		'mp4', 'm4v', 'mov', 'webm', 'mkv',
		'mp3', 'm4a', 'ogg', 'oga', 'wav', 'weba',
		'zip', 'gz', 'tgz', '7z', 'rar',
	],
	scanned: false,
};

/** The four icons the UI has, from an extension. Mirrors the server's grouping. */
function kindOf(name: string, type: string): Attachment['kind'] {
	if (type.startsWith('image/')) return 'image';
	if (/\.(png|jpe?g|gif|webp|avif|heic|heif|bmp|tiff?)$/i.test(name)) return 'image';
	if (/\.(log|txt|csv|json)$/i.test(name)) return 'log';
	if (/\.(pdf|docx?|xlsx?|pptx?|od[ts])$/i.test(name)) return 'pdf';
	return 'other';
}

const extensionOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toLowerCase() : '');

export interface AttachmentUploads {
	items: UploadItem[];
	policy: UploadPolicy;
	/** True while any file is still going out; the form should wait for it. */
	uploading: boolean;
	/** Ids to send with the create call. Only the files that actually stored. */
	attachmentIds: string[];
	/** The same files as domain attachments, for the mock store. */
	attachments: Attachment[];
	add: (files: FileList | File[]) => void;
	remove: (localId: string) => void;
	reset: () => void;
}

export function useAttachmentUploads(purpose: UploadPurpose = 'ticket_attachment'): AttachmentUploads {
	const live = isLiveApi();
	const org = useAuthStore((s) => s.org?.slug) ?? '';

	const [items, setItems] = useState<UploadItem[]>([]);

	// Object URLs and in-flight requests are the two things that outlive a
	// render and have to be cleaned up by hand.
	const objectUrls = useRef(new Map<string, string>());
	const requests = useRef(new Map<string, AbortController>());

	const policyQuery = useQuery({
		queryKey: ['uploads', 'policies', org],
		queryFn: () => uploadPolicies(org),
		enabled: live && Boolean(org),
		staleTime: 5 * 60_000,
	});

	const policy: UploadPolicy = useMemo(() => {
		const dto = policyQuery.data?.data.find((p) => p.purpose === purpose);
		if (!dto) return DEFAULT_UPLOAD_POLICY;
		return {
			maxFiles: dto.max_files,
			maxBytes: dto.max_bytes,
			extensions: dto.accepted_extensions,
			scanned: dto.scanned,
		};
	}, [policyQuery.data, purpose]);

	const patch = useCallback((localId: string, changes: Partial<UploadItem>) => {
		setItems((current) => current.map((item) => (item.localId === localId ? { ...item, ...changes } : item)));
	}, []);

	const add = useCallback(
		(incoming: FileList | File[]) => {
			const files = Array.from(incoming);
			if (!files.length) return;

			// Counted against what is already here, including failures the person
			// has not dismissed — they still occupy a row.
			setItems((current) => {
				const room = policy.maxFiles - current.length;
				if (room <= 0) {
					toast(`Up to ${policy.maxFiles} files.`, { tone: 'danger' });
					return current;
				}

				const accepted = files.slice(0, room);
				if (accepted.length < files.length) {
					toast(`Only the first ${room} file${room === 1 ? '' : 's'} were added — the limit is ${policy.maxFiles}.`, {
						tone: 'danger',
					});
				}

				const added: UploadItem[] = accepted.map((file) => {
					const localId = crypto.randomUUID();
					const base: UploadItem = {
						localId,
						name: file.name,
						size: formatBytes(file.size),
						bytes: file.size,
						kind: kindOf(file.name, file.type),
						status: 'uploading',
						progress: 0,
					};

					// Checked here as well as on the server, because telling someone
					// their 40 MB video is too big should not require sending it first.
					if (file.size > policy.maxBytes) {
						return { ...base, status: 'error', error: `Larger than ${formatBytes(policy.maxBytes)}` };
					}
					if (policy.extensions.length && !policy.extensions.includes(extensionOf(file.name))) {
						return { ...base, status: 'error', error: 'That kind of file is not accepted' };
					}

					if (live) {
						const controller = new AbortController();
						requests.current.set(localId, controller);

						uploadFile(org, file, purpose, {
							signal: controller.signal,
							onProgress: (fraction) => patch(localId, { progress: fraction }),
						})
							.then((dto) => {
								const attachment = attachmentDtoToDomain(dto);
								patch(localId, {
									status: 'ready',
									progress: 1,
									attachmentId: dto.id,
									url: attachment.url,
									scanStatus: attachment.scanStatus,
									// The server decides the real name and type; show what it
									// stored rather than what was sent.
									name: attachment.name,
									size: attachment.size,
									kind: attachment.kind,
								});
							})
							.catch((err: unknown) => {
								if (err instanceof ApiError && err.code === 'upload_cancelled') return;
								patch(localId, {
									status: 'error',
									error: err instanceof ApiError ? err.message : 'Upload failed',
								});
							})
							.finally(() => requests.current.delete(localId));

						return base;
					}

					// Mock mode: the file never leaves the browser.
					const url = URL.createObjectURL(file);
					objectUrls.current.set(localId, url);
					return { ...base, status: 'ready', progress: 1, url, scanStatus: 'skipped' };
				});

				return [...current, ...added];
			});
		},
		[live, org, patch, policy, purpose],
	);

	const forget = useCallback((localId: string) => {
		requests.current.get(localId)?.abort();
		requests.current.delete(localId);

		const url = objectUrls.current.get(localId);
		if (url) {
			URL.revokeObjectURL(url);
			objectUrls.current.delete(localId);
		}
	}, []);

	const remove = useCallback(
		(localId: string) => {
			const item = items.find((i) => i.localId === localId);
			forget(localId);
			setItems((current) => current.filter((i) => i.localId !== localId));

			// Stored but no longer wanted. The sweeper would get it eventually; not
			// waiting is both tidier and what the person just asked for.
			if (live && item?.attachmentId) {
				deleteAttachment(org, item.attachmentId).catch(() => {
					/* the sweeper is the backstop */
				});
			}
		},
		[forget, items, live, org],
	);

	const reset = useCallback(() => {
		for (const item of items) forget(item.localId);
		setItems([]);
	}, [forget, items]);

	// Unmounting with uploads in flight: stop them, and release the object URLs.
	// The bytes of an aborted upload are never recorded, so nothing leaks.
	useEffect(() => {
		// Captured on mount: both maps are created once and never replaced, and the
		// lint rule cannot know that.
		const inFlight = requests.current;
		const urls = objectUrls.current;

		return () => {
			for (const controller of inFlight.values()) controller.abort();
			for (const url of urls.values()) URL.revokeObjectURL(url);
			inFlight.clear();
			urls.clear();
		};
	}, []);

	return {
		items,
		policy,
		uploading: items.some((item) => item.status === 'uploading'),
		attachmentIds: items.filter((i) => i.status === 'ready' && i.attachmentId).map((i) => i.attachmentId!),
		attachments: items
			.filter((item) => item.status === 'ready')
			.map((item) => ({
				id: item.attachmentId ?? item.localId,
				name: item.name,
				size: item.size,
				kind: item.kind,
				bytes: item.bytes,
				url: item.url,
				scanStatus: item.scanStatus,
			})),
		add,
		remove,
		reset,
	};
}
