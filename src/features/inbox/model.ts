import { z } from 'zod';

export const inboxTabs = ['assigned', 'mentioned', 'watching', 'created'] as const;
export type InboxTab = (typeof inboxTabs)[number];
export const inboxSearchSchema = z.object({
	tab: z.enum(inboxTabs).default('assigned'),
	panel: z.string().optional(),
	priority: z.enum(['P1', 'P2', 'P3', 'P4']).optional(),
});
export type InboxSearch = z.infer<typeof inboxSearchSchema>;
