// Projects, from whichever source is active.
//
// The API returns its own shape; the pages consume the mock `Project` domain
// type. Rather than change every component, live rows are mapped onto that type
// here, with the fields the API does not model yet left empty rather than
// invented.

import { useMemo } from 'react';
import { useDb } from '@/mocks/db';
import { isLiveApi } from '@/shared/lib/live-api';
import type { Project } from '@/mocks/types';
import { useProjects, type ProjectDto } from '@/api/resources';

export function projectDtoToDomain(dto: ProjectDto): Project {
	return {
		id: dto.id,
		key: dto.key,
		name: dto.name,
		description: dto.description ?? '',
		kind: dto.kind,
		leadId: dto.lead_id ?? '',
		memberIds: dto.member_ids ?? [],
		// Per-viewer: the API answers for the requesting user.
		starred: dto.starred ?? false,
		archived: dto.archived,
		color: dto.color ?? 'teal',
		stats: {
			open: dto.open_count,
			cycleDays: 0,
			cycleDelta: '',
			overdue: 0,
			overdueDelta: '',
			openDelta: '',
		},
		activity: [],
		createdAt: Date.parse(dto.created_at),
	};
}

export function useProjectList(orgSlug: string): { projects: Project[]; loading: boolean } {
	const live = isLiveApi();
	const mock = useDb((s) => s.projects);
	const query = useProjects(orgSlug);

	const mapped = useMemo(() => (query.data ?? []).map(projectDtoToDomain), [query.data]);

	if (!live) return { projects: mock, loading: false };
	return { projects: mapped, loading: query.isPending };
}
