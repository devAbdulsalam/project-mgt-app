// One project by key, from whichever source is active.

import { useMemo } from 'react';
import { useDb } from '@/mocks/db';
import { isLiveApi } from '@/shared/lib/live-api';
import { useProject as useProjectQuery } from '@/api/resources';
import type { Project } from '@/mocks/types';
import { projectDtoToDomain } from './useProjectList';

export function useProject(orgSlug: string, key: string): { project: Project | undefined; loading: boolean } {
	const live = isLiveApi();
	const mock = useDb((s) => s.projects.find((p) => p.key === key));
	const query = useProjectQuery(orgSlug, key);

	// Memoised: settings and drafts downstream compare by identity, and a fresh
	// object per render would look like the project changing every time.
	const mapped = useMemo(() => (query.data ? projectDtoToDomain(query.data) : undefined), [query.data]);

	if (!live) return { project: mock, loading: false };
	return { project: mapped, loading: query.isPending };
}
