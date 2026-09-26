// The project's active sprint, from whichever source is active.
//
// Board, calendar and workload all want it. The overview hook already knows how
// to get it from either place, so this only narrows that to the one field.

import { useProjectOverview } from './useProjectOverview';
import type { Project, Sprint } from '@/mocks/types';

export function useProjectSprint(orgSlug: string, project: Project): Sprint | undefined {
	return useProjectOverview(orgSlug, project).sprint;
}
