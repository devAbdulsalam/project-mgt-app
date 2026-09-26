import { z } from 'zod';

export const expensesSearchSchema = z.object({
	program: z.string().optional(),
	status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'paid']).optional(),
	mine: z.boolean().optional(),
});

export type ExpensesSearch = z.infer<typeof expensesSearchSchema>;
