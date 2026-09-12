import { z } from 'zod';

export const notificationsSearchSchema = z.object({ filter: z.enum(['all', 'unread', 'mentions', 'assigned', 'sla']).default('all') });
export type NotificationFilter = z.infer<typeof notificationsSearchSchema>['filter'];
