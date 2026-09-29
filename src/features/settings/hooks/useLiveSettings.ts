// Live workspace settings: the server's value for a settings slice, and how to save it.
//
// Inert in mock mode. Split from the components in ../live.tsx so this file can
// export plain values and functions.

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useAuthStore } from '@/shared/lib/auth-store';
import { isLiveApi } from '@/shared/lib/live-api';
import { toast } from '@/shared/lib/toast-store';
import type { OrgSettings } from '@/mocks/types';

export const errorMessage = (err: unknown, fallback: string) =>
	err instanceof ApiError ? (Object.values(err.fieldErrors)[0]?.[0] ?? err.message) : fallback;

// -- Workspace settings -------------------------------------------------------

interface SettingsDto {
	name: string;
	slug: string;
	prefix: string | null;
	plan: string;
	general: Record<string, unknown>;
	business_hours: OrgSettings['businessHours'] | null;
	branding: Record<string, unknown>;
}

/** Sections whose draft is read from and saved to the server. */
export const LIVE_DRAFTS = ['general', 'businessHours', 'branding'] as const;
export type LiveDraftSection = (typeof LIVE_DRAFTS)[number];

/** Sections that talk to the backend, for the notice on the ones that do not. */
export const LIVE_SECTIONS = new Set(['general', 'business-hours', 'branding', 'team', 'sla', 'api', 'notifications']);

// What a workspace that has never saved shows. Neutral on purpose: the demo
// company's registered numbers must not appear as if they were this workspace's.
const GENERAL_DEFAULTS: OrgSettings['general'] = {
	companyName: '',
	slug: '',
	rc: '',
	tin: '',
	headOffice: '',
	supportPhone: '',
	supportEmail: '',
	ticketPrefix: '',
	timezone: 'Africa/Lagos · West Africa Time (GMT+1)',
	currency: '₦ NGN · Naira',
	vatPct: 7.5,
	dateFormat: '10 Sep 2026 · 24h',
	languages: ['English (NG)'],
};
const HOURS_DEFAULTS: OrgSettings['businessHours'] = {
	weekdays: { on: true, from: '08:00', to: '18:00' },
	saturday: { on: false, from: '', to: '' },
	sunday: { on: false, from: '', to: '' },
};
const BRANDING_DEFAULTS: OrgSettings['branding'] = { accent: '#1e3a47', portalName: '', portalTagline: '', emailFooter: '', logoInitials: '' };

export const settingsKey = (org: string) => ['org', org, '/settings'] as const;

export function useServerSettings(orgSlug: string) {
	return useQuery({
		queryKey: settingsKey(orgSlug),
		queryFn: ({ signal }) => api.get<SettingsDto>(`/orgs/${orgSlug}/settings`, { signal }),
		enabled: isLiveApi() && Boolean(orgSlug),
		staleTime: 30_000,
	});
}

/**
 * The server's value for one settings slice and how to save it, or null when
 * the source is the mock store. The value is memoised on the response so the
 * draft logic (which compares by reference) sees a change only when there is one.
 */
export function useLiveSection<K extends keyof OrgSettings>(section: K): { value: OrgSettings[K]; save: (draft: OrgSettings[K]) => Promise<boolean> } | null {
	const orgSlug = useAuthStore((s) => s.org?.slug ?? '');
	const queryClient = useQueryClient();
	const query = useServerSettings(orgSlug);
	const data = query.data;

	const value = useMemo(() => {
		if (!data || !(LIVE_DRAFTS as readonly string[]).includes(section)) return null;
		if (section === 'general') return { ...GENERAL_DEFAULTS, ...data.general, companyName: data.name, slug: data.slug, ticketPrefix: data.prefix ?? '' };
		if (section === 'businessHours') return data.business_hours ?? HOURS_DEFAULTS;
		return { ...BRANDING_DEFAULTS, ...data.branding };
	}, [data, section]) as OrgSettings[K] | null;

	if (!isLiveApi() || !value) return null;

	const save = async (draft: OrgSettings[K]) => {
		let patch: Record<string, unknown>;
		if (section === 'general') {
			const { companyName, ticketPrefix, ...rest } = { ...(draft as OrgSettings['general']), slug: undefined };
			patch = { name: companyName, prefix: ticketPrefix || null, general: rest };
		} else if (section === 'businessHours') {
			patch = { business_hours: draft };
		} else {
			patch = { branding: draft };
		}
		try {
			const saved = await api.patch<SettingsDto>(`/orgs/${orgSlug}/settings`, { json: patch });
			queryClient.setQueryData(settingsKey(orgSlug), saved);
			// The workspace name is also shown in the app shell.
			useAuthStore.setState((s) => (s.org ? { org: { ...s.org, name: saved.name }, availableOrgs: s.availableOrgs.map((o) => (o.slug === orgSlug ? { ...o, name: saved.name } : o)) } : {}));
			return true;
		} catch (err) {
			toast(errorMessage(err, 'Could not save these settings.'), { tone: 'danger' });
			return false;
		}
	};
	return { value, save };
}
