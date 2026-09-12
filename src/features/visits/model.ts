import { z } from 'zod';

export const visitsSearchSchema = z.object({
	view: z.enum(['today', 'week']).default('today'),
	region: z.string().optional(),
	visit: z.string().optional(),
	client: z.string().optional(),
	panel: z.string().optional(),
});
export type VisitsSearch = z.infer<typeof visitsSearchSchema>;

export const priorityColor = { P1: '#d93f3f', P2: '#c2410c', P3: '#e0a100', P4: '#8a97a0' } as const;
