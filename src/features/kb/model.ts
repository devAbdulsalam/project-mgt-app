import { z } from 'zod';

export const kbSearchSchema = z.object({ q: z.string().optional(), category: z.string().optional(), visibility: z.enum(['all', 'public', 'internal', 'draft']).default('all') });
export type KbSearch = z.infer<typeof kbSearchSchema>;
export const kbCategories = ['Microsoft 365', 'Payments & POS', 'Contracts & SLA', 'Runbooks', 'Power', 'Helpdesk playbook', 'Endpoints', 'Compliance', 'Network'];
