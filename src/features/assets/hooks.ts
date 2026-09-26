// Assets, from whichever source is active.
//
// Two things differ between the two sides and are reconciled here:
//
//   identity  the mock keys assets by `tag`; the API keys them by uuid and
//             treats the tag as a unique business key. The hook keeps a
//             tag -> id map so the pages can keep passing tags around.
//   status    the mock stores display words ('Healthy'); the API stores values
//             ('active'). The mapping is lossy in one direction — see below.

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useDb } from '@/mocks/db';
import { isLiveApi } from '@/shared/lib/live-api';
import { toast } from '@/shared/lib/toast-store';
import type { Asset, AssetCategory, AssetStatus } from '@/mocks/types';
import { useAssets as useAssetsQuery, type AssetDto } from '@/api/resources';

/**
 * Display status from stored status.
 *
 * Lossy on the way back: the UI has six words for five states, and both
 * 'Healthy' and 'Active' mean `active` while 'Expiring' is not a state at all —
 * it is derived from the warranty date. Nothing writes 'Expiring', so the
 * round trip is safe in practice.
 */
const STATUS_LABEL: Record<string, AssetStatus> = {
	active: 'Healthy',
	in_repair: 'Degraded',
	lost: 'Down',
	retired: 'Down',
	spare: 'In stock',
};

const STATUS_VALUE: Record<AssetStatus, string> = {
	Healthy: 'active',
	Active: 'active',
	Expiring: 'active',
	Degraded: 'in_repair',
	Down: 'lost',
	'In stock': 'spare',
};

/** The categories the UI draws icons for; the API also has printers and "other". */
const UI_CATEGORIES: readonly string[] = ['endpoint', 'network', 'server', 'power', 'licence', 'pos'];

function toDomain(dto: AssetDto): Asset {
	const specs = dto.specs ?? {};
	// A licence's end is its expiry; hardware has a warranty. The page shows one column.
	const endsOn = dto.warranty_ends ?? dto.expires_on;

	return {
		tag: dto.tag,
		name: dto.name,
		detail: [dto.manufacturer, dto.model].filter(Boolean).join(' ') || '',
		serial: dto.serial_number ?? '',
		category: (UI_CATEGORIES.includes(dto.category) ? dto.category : 'endpoint') as AssetCategory,
		clientId: dto.client_id ?? '',
		site: dto.site_name ?? '',
		status: dto.expired || dto.warranty_expired ? 'Expiring' : (STATUS_LABEL[dto.status] ?? 'Healthy'),
		agent: String(specs.agent ?? 'n/a'),
		// `warranty_ends` is a calendar day (YYYY-MM-DD), not a timestamp — the
		// backend's DATE parser keeps it that way so it cannot shift a day.
		warrantyAt: endsOn ? Date.parse(`${endsOn}T00:00:00Z`) : 0,
		user: specs.user ? String(specs.user) : undefined,
		location: specs.location ? String(specs.location) : undefined,
		openTicketKey: dto.open_ticket_key ?? undefined,
		firmware: specs.firmware ? String(specs.firmware) : undefined,
		firmwareAvailable: specs.firmware_available ? String(specs.firmware_available) : undefined,
		wan: specs.wan ? String(specs.wan) : undefined,
		purchased: dto.purchased_on ?? undefined,
		monitoring: specs.monitoring ? String(specs.monitoring) : undefined,
		// Not modelled server-side yet; an empty history is honest, invented
		// entries would not be.
		history: [],
	};
}

export function useAssetList(orgSlug: string, filters: { client_id?: string; category?: string; q?: string } = {}) {
	const live = isLiveApi();
	const mock = useDb((s) => s.assets);
	// The pages filter, tab and count client-side, so they need the whole list
	// (the API's ceiling), not its default page of 100.
	const query = useAssetsQuery(orgSlug, { ...filters, limit: 500 });

	const assets = useMemo(() => (query.data ?? []).map(toDomain), [query.data]);

	/** Tag -> uuid, so callers can keep addressing assets by tag. */
	const idByTag = useMemo(() => {
		const map = new Map<string, string>();
		for (const dto of query.data ?? []) map.set(dto.tag, dto.id);
		return map;
	}, [query.data]);

	if (!live) {
		const scoped = filters.client_id ? mock.filter((a) => a.clientId === filters.client_id) : mock;
		return { assets: scoped, loading: false, error: null, refetch: () => {}, idByTag: new Map<string, string>() };
	}
	return { assets, loading: query.isPending, error: query.error, refetch: () => void query.refetch(), idByTag };
}

export interface NewAsset {
	tag: string;
	name: string;
	detail?: string;
	serial: string;
	category: AssetCategory;
	clientId: string;
	site: string;
	user?: string;
	status: AssetStatus;
	/** 0 when the date is unknown. */
	warrantyAt: number;
}

export interface AssetActions {
	create: (input: NewAsset) => Promise<boolean>;
	/** One request for the whole file; reports how many rows made it. */
	importMany: (rows: NewAsset[]) => Promise<{ created: number; failed: number; message?: string }>;
	update: (tag: string, patch: Partial<Asset>) => Promise<boolean>;
	remove: (tag: string) => Promise<boolean>;
}

/** The request body for one asset, shared by create and import. */
function toPayload(input: NewAsset) {
	const day = input.warrantyAt ? new Date(input.warrantyAt).toISOString().slice(0, 10) : undefined;

	return {
		tag: input.tag,
		name: input.name,
		category: input.category,
		status: STATUS_VALUE[input.status],
		client_id: input.clientId || undefined,
		// Named, not identified: the server finds or creates it under the client.
		site_name: input.clientId && input.site ? input.site : undefined,
		serial_number: input.serial || undefined,
		manufacturer: input.detail || undefined,
		// A date input gives a calendar day; send it as one rather than as a
		// timestamp that a timezone could shift.
		...(input.category === 'licence' ? { expires_on: day } : { warranty_ends: day }),
		specs: input.user ? { user: input.user } : undefined,
	};
}

export function useAssetActions(orgSlug: string, idByTag: Map<string, string>): AssetActions {
	const live = isLiveApi();
	const db = useDb();
	const queryClient = useQueryClient();

	const invalidate = useCallback(
		() => queryClient.invalidateQueries({ queryKey: ['org', orgSlug] }),
		[queryClient, orgSlug],
	);

	if (!live) {
		return {
			async create(input) {
				db.addAsset({ ...input, detail: input.detail ?? '', agent: 'n/a', history: [] } as never);
				return true;
			},
			async importMany(rows) {
				for (const input of rows) db.addAsset({ ...input, detail: input.detail ?? '', agent: 'n/a', history: [] } as never);
				return { created: rows.length, failed: 0 };
			},
			async update(tag, patch) {
				db.updateAsset(tag, patch as never, 'Details edited');
				return true;
			},
			async remove(tag) {
				db.deleteAsset(tag);
				return true;
			},
		};
	}

	return {
		async create(input) {
			try {
				await api.post(`/orgs/${orgSlug}/assets`, { json: toPayload(input), idempotencyKey: crypto.randomUUID() });
				await invalidate();
				return true;
			} catch (err) {
				if (err instanceof ApiError && err.code === 'asset_tag_taken') {
					toast(`An asset tagged ${input.tag} already exists.`, { tone: 'danger' });
				} else {
					toast(err instanceof ApiError ? err.message : 'Could not create that asset.', { tone: 'danger' });
				}
				return false;
			}
		},

		async importMany(rows) {
			try {
				const res = await api.post<{ created: number; failed: number }>(`/orgs/${orgSlug}/assets/import`, {
					json: { assets: rows.map(toPayload) },
				});
				await invalidate();
				return res;
			} catch (err) {
				// The server answers 422 when not one row made it, and says why.
				return { created: 0, failed: rows.length, message: err instanceof ApiError ? err.message : 'Could not import that file.' };
			}
		},

		async update(tag, patch) {
			const id = idByTag.get(tag);
			if (!id) return false;

			const body: Record<string, unknown> = {};
			if (patch.name !== undefined) body.name = patch.name;
			if (patch.status !== undefined) body.status = STATUS_VALUE[patch.status];
			if (patch.serial !== undefined) body.serial_number = patch.serial;
			// Named, and the server places it under the asset's client.
			if (patch.site) body.site_name = patch.site;

			// Free-form details live in `specs`, which the server merges, so only
			// the keys the person touched are sent. Clearing one sends null.
			const specs: Record<string, unknown> = {};
			if ('user' in patch) specs.user = patch.user ?? null;
			if ('location' in patch) specs.location = patch.location ?? null;
			if ('firmware' in patch) specs.firmware = patch.firmware ?? null;
			if ('firmwareAvailable' in patch) specs.firmware_available = patch.firmwareAvailable ?? null;
			if (Object.keys(specs).length) body.specs = specs;

			if (!Object.keys(body).length) return true;

			try {
				await api.patch(`/orgs/${orgSlug}/assets/${id}`, { json: body });
				await invalidate();
				return true;
			} catch (err) {
				toast(err instanceof ApiError ? err.message : 'Could not save that asset.', { tone: 'danger' });
				return false;
			}
		},

		async remove(tag) {
			const id = idByTag.get(tag);
			if (!id) return false;
			try {
				await api.del(`/orgs/${orgSlug}/assets/${id}`);
				await invalidate();
				return true;
			} catch (err) {
				toast(err instanceof ApiError ? err.message : 'Could not delete that asset.', { tone: 'danger' });
				return false;
			}
		},
	};
}
