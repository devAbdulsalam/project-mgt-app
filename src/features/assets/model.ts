import { z } from 'zod';
import type { AssetCategory, AssetStatus } from '@/mocks/types';
import type { PillTone } from '@/shared/ui/Pill';

export const assetTabs = ['all', 'endpoint', 'network', 'server', 'power', 'licence', 'warranty'] as const;
export type AssetTab = (typeof assetTabs)[number];
export const assetTabLabels: Record<AssetTab, string> = { all: 'All', endpoint: 'Endpoints', network: 'Network', server: 'Servers', power: 'Power / UPS', licence: 'Licences', warranty: 'Warranty ≤ 90d' };

export const assetsSearchSchema = z.object({
	tab: z.enum(assetTabs).default('all'),
	q: z.string().optional(),
	client: z.string().optional(),
	site: z.string().optional(),
	status: z.string().optional(),
	agent: z.string().optional(),
	asset: z.string().optional(),
	panel: z.string().optional(),
});
export type AssetsSearch = z.infer<typeof assetsSearchSchema>;

export const categoryLabel: Record<AssetCategory, string> = { endpoint: 'Endpoint', network: 'Network', server: 'Server', power: 'Power / UPS', licence: 'Licence', pos: 'POS' };
export const statusTone = (s: AssetStatus): PillTone => (s === 'Healthy' || s === 'Active' ? 'done' : s === 'Down' ? 'blocked' : s === 'In stock' ? 'closed' : 'open');
