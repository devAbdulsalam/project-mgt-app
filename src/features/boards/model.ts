import { z } from 'zod';

export const boardSortKeys = ['name', 'type', 'open', 'mine'] as const;

export const boardsSearchSchema = z.object({
	q: z.string().optional(),
	view: z.enum(['cards', 'list']).default('cards'),
	/** Absent means the default order: favourites first, then by name. */
	sort: z.enum(boardSortKeys).optional(),
	dir: z.enum(['asc', 'desc']).default('asc'),
});
export type BoardsSearch = z.infer<typeof boardsSearchSchema>;
