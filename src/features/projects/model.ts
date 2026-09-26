import { z } from 'zod';

export const projectSortKeys = ['name', 'date', 'type', 'lead'] as const;
export const projectsSearchSchema = z.object({
	q: z.string().optional(),
	view: z.enum(['cards', 'table']).default('cards'),
	archived: z.boolean().optional(),
	/** Absent means the default order: favourites first, then by name. */
	sort: z.enum(projectSortKeys).optional(),
	dir: z.enum(['asc', 'desc']).default('asc'),
});
export type ProjectsSearch = z.infer<typeof projectsSearchSchema>;
export const boardSearchSchema = z.object({ panel: z.string().optional(), assignee: z.string().optional() });
export type BoardSearch = z.infer<typeof boardSearchSchema>;
export const calendarSearchSchema = z.object({
	view: z.enum(['month', 'week']).default('month'),
	/** Anchor day, YYYY-MM-DD. Defaults to today. */
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
	panel: z.string().optional(),
	assignee: z.string().optional(),
	hideDone: z.boolean().optional(),
});
export type CalendarSearch = z.infer<typeof calendarSearchSchema>;
export const workloadSearchSchema = z.object({
	period: z.enum(['week', 'fortnight', 'sprint']).default('week'),
	panel: z.string().optional(),
	type: z.enum(['task', 'bug', 'story', 'subtask', 'support']).optional(),
});
export type WorkloadSearch = z.infer<typeof workloadSearchSchema>;
