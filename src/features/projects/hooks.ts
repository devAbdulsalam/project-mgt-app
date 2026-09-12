import { useMemo } from 'react';
import { useDb } from '@/mocks/db';
import { statusCategory } from '@/mocks/seed';
import type { Project } from '@/mocks/types';

/** Live counts for a project. Seeded projects carry an aggregate open count standing in for a larger dataset. */
export function useProjectStats(p: Project) {
	const tickets = useDb((s) => s.tickets);
	return useMemo(() => {
		const mine = tickets.filter((t) => t.projectKey === p.key);
		const openLive = mine.filter((t) => statusCategory[t.status] !== 'done').length;
		const lastActivity = Math.max(p.activity[0]?.at ?? 0, ...mine.map((t) => t.updatedAt));
		return { open: Math.max(p.stats.open, openLive), openLive, total: mine.length, lastActivity: lastActivity || p.createdAt, done: mine.filter((t) => statusCategory[t.status] === 'done').length };
	}, [tickets, p]);
}
