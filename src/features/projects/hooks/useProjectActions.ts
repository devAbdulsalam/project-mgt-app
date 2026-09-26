// Project writes, from whichever source is active.
//
// These were the last things holding the projects page on the mock store:
// membership and starring had no server-side model until `project_members` and
// `project_stars` were added.

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useDb } from '@/mocks/db';
import { useActor } from '@/features/tickets/hooks/useActor';
import { isLiveApi } from '@/shared/lib/live-api';
import { toast } from '@/shared/lib/toast-store';
import type { Project } from '@/mocks/types';

export interface ProjectActions {
	create: (input: {
		key: string;
		name: string;
		description?: string;
		kind: 'service' | 'software';
		leadId?: string;
		memberIds?: string[];
		color?: string;
	}) => Promise<boolean>;
	setArchived: (project: Project, archived: boolean) => Promise<boolean>;
	toggleStar: (project: Project) => Promise<void>;
	update: (
		project: Project,
		patch: { name?: string; description?: string; memberIds?: string[]; kind?: Project['kind']; leadId?: string; color?: string },
	) => Promise<boolean>;
	remove: (project: Project) => Promise<boolean>;
}

export function useProjectActions(orgSlug: string): ProjectActions {
	const live = isLiveApi();
	const db = useDb();
	const actor = useActor();
	const queryClient = useQueryClient();

	const invalidate = useCallback(
		() => queryClient.invalidateQueries({ queryKey: ['org', orgSlug] }),
		[queryClient, orgSlug],
	);

	const report = (err: unknown, fallback: string) => {
		if (err instanceof ApiError && err.code === 'project_key_taken') {
			toast('A project with that key already exists.', { tone: 'danger' });
			return;
		}
		if (err instanceof ApiError && err.code === 'member_not_in_org') {
			toast('Only workspace members can be added to a project.', { tone: 'danger' });
			return;
		}
		toast(err instanceof ApiError ? err.message : fallback, { tone: 'danger' });
	};

	if (!live) {
		return {
			async create(input) {
				db.createProject(input as never, actor);
				return true;
			},
			async setArchived(project, archived) {
				db.archiveProject(project.id, archived);
				return true;
			},
			async toggleStar(project) {
				db.toggleStar(project.id);
			},
			async update(project, patch) {
				db.updateProject(project.id, patch as never);
				return true;
			},
			async remove(project) {
				db.deleteProject(project.id);
				return true;
			},
		};
	}

	return {
		async create(input) {
			try {
				await api.post(`/orgs/${orgSlug}/projects`, {
					json: {
						key: input.key.toUpperCase(),
						name: input.name,
						description: input.description,
						kind: input.kind,
						lead_id: input.leadId,
						member_ids: input.memberIds,
						color: input.color,
					},
					idempotencyKey: crypto.randomUUID(),
				});
				await invalidate();
				return true;
			} catch (err) {
				report(err, 'Could not create that project.');
				return false;
			}
		},

		async setArchived(project, archived) {
			try {
				// Projects are addressed by key, not id — that is what the URL uses
				// and what a person recognises.
				await api.patch(`/orgs/${orgSlug}/projects/${project.key}`, { json: { archived } });
				await invalidate();
				return true;
			} catch (err) {
				report(err, 'Could not archive that project.');
				return false;
			}
		},

		async toggleStar(project) {
			try {
				const path = `/orgs/${orgSlug}/projects/${project.key}/star`;
				if (project.starred) await api.del(path);
				else await api.put(path);
				await invalidate();
			} catch (err) {
				report(err, 'Could not change your favourites.');
			}
		},

		async update(project, patch) {
			try {
				await api.patch(`/orgs/${orgSlug}/projects/${project.key}`, {
					json: {
						name: patch.name,
						description: patch.description,
						member_ids: patch.memberIds,
						kind: patch.kind,
						lead_id: patch.leadId || undefined,
						color: patch.color,
					},
				});
				await invalidate();
				return true;
			} catch (err) {
				report(err, 'Could not save that project.');
				return false;
			}
		},

		async remove(project) {
			try {
				await api.del(`/orgs/${orgSlug}/projects/${project.key}`);
				await invalidate();
				return true;
			} catch (err) {
				report(err, 'Could not delete that project.');
				return false;
			}
		},
	};
}
