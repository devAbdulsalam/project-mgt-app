// Knowledge base, from whichever source is active.

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useDb } from '@/mocks/db';
import { useActor } from '@/features/tickets/hooks/useActor';
import { isLiveApi } from '@/shared/lib/live-api';
import { toast } from '@/shared/lib/toast-store';
import type { KbArticle } from '@/mocks/types';
import { useArticle, useArticles, type ArticleDto } from '@/api/resources';

/** Roughly 200 words a minute, which is the usual reading-time convention. */
const readingMinutes = (body: string) => Math.max(1, Math.round(body.split(/\s+/).length / 200));

function toDomain(dto: ArticleDto & { body?: string }): KbArticle {
	return {
		id: dto.id,
		slug: dto.slug,
		title: dto.title,
		category: dto.category ?? 'General',
		summary: dto.excerpt ?? '',
		body: dto.body ?? '',
		readMin: readingMinutes(dto.body ?? dto.excerpt ?? ''),
		views: dto.views,
		helpful: dto.helpful,
		notHelpful: dto.not_helpful,
		updatedAt: Date.parse(dto.updated_at),
		authorId: dto.author_id ?? '',
		visibility: dto.visibility === 'public' ? 'public' : 'internal',
		// The API has three states; the UI shows two, and an archived article
		// reads as a draft because neither is published.
		status: dto.status === 'published' ? 'Published' : 'Draft',
		tags: dto.tags ?? [],
	};
}

export function useKbList(orgSlug: string, filters: { q?: string; category?: string } = {}) {
	const live = isLiveApi();
	const mock = useDb((s) => s.kb);
	// The API's ceiling; the page shows every article and filters status locally.
	const query = useArticles(orgSlug, { ...filters, limit: 200 });

	const articles = useMemo(() => (query.data ?? []).map(toDomain), [query.data]);

	if (!live) return { articles: mock, loading: false, error: null, refetch: () => {} };
	return { articles, loading: query.isPending, error: query.error, refetch: () => void query.refetch() };
}

/** One article with its body; the list carries only the summary. */
export function useKbArticle(orgSlug: string, slug: string | undefined) {
	const live = isLiveApi();
	const mock = useDb((s) => s.kb.find((a) => a.slug === slug));
	const query = useArticle(orgSlug, slug);

	const article = useMemo(() => (query.data ? toDomain(query.data) : undefined), [query.data]);

	if (!live) return { article: mock, loading: false, error: null };
	return { article, loading: query.isPending, error: query.error };
}

export interface ArticleInput {
	title: string;
	summary: string;
	body: string;
	category: string;
	tags: string[];
	visibility: KbArticle['visibility'];
	status: KbArticle['status'];
}

export function useKbActions(orgSlug: string) {
	const live = isLiveApi();
	const db = useDb();
	const actor = useActor();
	const queryClient = useQueryClient();

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ['org', orgSlug] });
	const report = (err: unknown, fallback: string) =>
		toast(err instanceof ApiError ? err.message : fallback, { tone: 'danger' });

	// The mock store keys articles by id; the pages and the API address them by slug.
	const mockId = (slug: string) => db.kb.find((a) => a.slug === slug)?.id;

	return {
		/** Resolves to the new article's slug, or undefined after telling the person why not. */
		async create(input: ArticleInput): Promise<string | undefined> {
			if (!live) return db.createArticle(input, actor).slug;
			try {
				const created = await api.post<{ slug: string }>(`/orgs/${orgSlug}/kb`, {
					json: {
						title: input.title,
						body: input.body,
						excerpt: input.summary,
						category: input.category,
						tags: input.tags,
						// Said in the same call, so a published article is never briefly a draft.
						status: input.status === 'Published' ? 'published' : 'draft',
						visibility: input.visibility,
					},
					idempotencyKey: crypto.randomUUID(),
				});
				await invalidate();
				return created.slug;
			} catch (err) {
				report(err, 'Could not create that article.');
				return undefined;
			}
		},

		async update(slug: string, patch: Partial<KbArticle>): Promise<boolean> {
			if (!live) {
				const id = mockId(slug);
				if (id) db.updateArticle(id, patch);
				return true;
			}

			const body: Record<string, unknown> = {};
			if (patch.title !== undefined) body.title = patch.title;
			if (patch.body !== undefined) body.body = patch.body;
			if (patch.summary !== undefined) body.excerpt = patch.summary;
			if (patch.category !== undefined) body.category = patch.category;
			if (patch.tags !== undefined) body.tags = patch.tags;
			// Publishing and exposing publicly are separate acts server-side, so
			// they are sent as separate fields rather than one "live" flag.
			if (patch.status !== undefined) body.status = patch.status === 'Published' ? 'published' : 'draft';
			if (patch.visibility !== undefined) body.visibility = patch.visibility;

			try {
				await api.patch(`/orgs/${orgSlug}/kb/${slug}`, { json: body });
				await invalidate();
				return true;
			} catch (err) {
				report(err, 'Could not save that article.');
				return false;
			}
		},

		async remove(slug: string): Promise<boolean> {
			if (!live) {
				const id = mockId(slug);
				if (id) db.deleteArticle(id);
				return true;
			}
			try {
				await api.del(`/orgs/${orgSlug}/kb/${slug}`);
				await invalidate();
				return true;
			} catch (err) {
				report(err, 'Could not delete that article.');
				return false;
			}
		},

		async vote(slug: string, helpful: boolean): Promise<boolean> {
			if (!live) {
				const id = mockId(slug);
				if (id) db.voteArticle(id, helpful);
				return true;
			}
			try {
				await api.post(`/orgs/${orgSlug}/kb/${slug}/vote`, { json: { helpful } });
				await invalidate();
				return true;
			} catch (err) {
				report(err, 'Could not record that vote.');
				return false;
			}
		},
	};
}
