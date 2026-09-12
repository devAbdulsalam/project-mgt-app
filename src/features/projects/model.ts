import { z } from 'zod';

export const projectsSearchSchema = z.object({ q: z.string().optional(), view: z.enum(['cards', 'table']).default('cards'), archived: z.boolean().optional() });
export type ProjectsSearch = z.infer<typeof projectsSearchSchema>;
export const boardSearchSchema = z.object({ panel: z.string().optional(), assignee: z.string().optional() });
export type BoardSearch = z.infer<typeof boardSearchSchema>;
