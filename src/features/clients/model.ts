import { z } from 'zod';

export const clientsSearchSchema = z.object({
	q: z.string().optional(),
	industry: z.string().optional(),
	plan: z.enum(['Gold', 'Silver', 'Bronze', 'Trial']).optional(),
	city: z.string().optional(),
	renewal: z.boolean().optional(),
	sort: z.enum(['mrr', 'name', 'renewal', 'health', 'open']).default('mrr'),
});
export type ClientsSearch = z.infer<typeof clientsSearchSchema>;

export const clientTabs = ['overview', 'tickets', 'sites', 'assets', 'contract', 'invoices', 'visits', 'notes'] as const;
export type ClientTab = (typeof clientTabs)[number];
export const clientDetailSearchSchema = z.object({ tab: z.enum(clientTabs).default('overview'), panel: z.string().optional() });
export type ClientDetailSearch = z.infer<typeof clientDetailSearchSchema>;

export const planTone = { Gold: 'teal', Silver: 'closed', Bronze: 'closed', Trial: 'new' } as const;
