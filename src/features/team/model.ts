import { z } from 'zod';

export const teamSearchSchema = z.object({
	q: z.string().optional(),
	role: z.string().optional(),
	team: z.string().optional(),
	base: z.string().optional(),
	status: z.enum(['active', 'all', 'invited', 'deactivated']).default('active'),
	sort: z.enum(['active', 'name', 'open']).default('active'),
	member: z.string().optional(),
});
export type TeamSearch = z.infer<typeof teamSearchSchema>;
