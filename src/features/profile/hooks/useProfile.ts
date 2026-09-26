// The signed-in person's profile, password and devices, live.
//
// Mock mode keeps all of this on the auth store, as the page always did; these
// hooks are inert there. Live, the store is still what the page reads — the
// server's profile is copied into it on load and after every save — so the
// sections do not need two code paths for display, only for saving.

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import { uploadFile } from '@/features/tickets/api/uploads';
import type { User } from '@/mocks/data';
import { useAuthStore } from '@/shared/lib/auth-store';
import { isLiveApi } from '@/shared/lib/live-api';

export interface ProfileDto {
	name: string;
	phone: string | null;
	display_name: string;
	title: string;
	team: string;
	base: string;
	timezone: string;
	languages: string[];
	signature: string;
	/**
	 * A stable URL, or null when there is no photo. Stable is what makes it safe
	 * to keep in the persisted auth store: a signed link would expire while the
	 * browser still held it.
	 */
	avatar_url: string | null;
}

export type ProfilePatch = Partial<Omit<ProfileDto, 'phone' | 'avatar_url'>> & { phone?: string | null };

/** Empty strings mean "never set", which the page renders with its own defaults. */
function toUserPatch(p: ProfileDto): Partial<User> {
	return {
		name: p.name,
		phone: p.phone ?? undefined,
		displayName: p.display_name || undefined,
		title: p.title || undefined,
		team: p.team || undefined,
		base: p.base || undefined,
		timezone: p.timezone || undefined,
		languages: p.languages.length ? p.languages : undefined,
		signature: p.signature || undefined,
		// undefined rather than null: `updateUser` spreads the patch, so this is
		// what clears the photo from the store when the server says there is none.
		avatarUrl: p.avatar_url ?? undefined,
	};
}

/**
 * Loads the profile into the auth store once. `ready` is true immediately in
 * mock mode, and after the first response live, so a form seeded from the store
 * never starts from stale values.
 */
export function useLiveProfile() {
	const live = isLiveApi();
	const query = useQuery({
		queryKey: ['auth', 'profile'],
		queryFn: async ({ signal }) => {
			const profile = await api.get<ProfileDto>('/auth/profile', { signal });
			useAuthStore.getState().updateUser(toUserPatch(profile));
			return profile;
		},
		enabled: live,
		staleTime: Infinity,
		refetchOnWindowFocus: false,
	});
	return { ready: !live || query.isSuccess, failed: live && query.isError };
}

export function useSaveProfile() {
	const queryClient = useQueryClient();
	const updateUser = useAuthStore((s) => s.updateUser);
	return async (patch: ProfilePatch) => {
		const saved = await api.patch<ProfileDto>('/auth/profile', { json: patch });
		updateUser(toUserPatch(saved));
		queryClient.setQueryData(['auth', 'profile'], saved);
	};
}

/**
 * Setting and removing the profile photo.
 *
 * The photo is not a profile field: it is an uploaded file, so it goes as
 * multipart to the uploads endpoint rather than in a PATCH. Both calls end by
 * writing the server's own answer into the store, so what the page shows is
 * never a guess about what happened.
 */
export function useAvatarActions(orgSlug: string) {
	const queryClient = useQueryClient();
	const updateUser = useAuthStore((s) => s.updateUser);

	const apply = (profile: ProfileDto) => {
		updateUser(toUserPatch(profile));
		queryClient.setQueryData(['auth', 'profile'], profile);
	};

	return {
		/** Uploads the file, then re-reads the profile for the URL that now serves it. */
		async upload(file: File) {
			await uploadFile(orgSlug, file, 'avatar');
			apply(await api.get<ProfileDto>('/auth/profile'));
		},
		/** The response is the updated profile, so there is nothing to re-read. */
		async remove() {
			apply(await api.del<ProfileDto>('/auth/profile/avatar'));
		},
	};
}

export interface DeviceDto {
	id: string;
	user_agent: string | null;
	ip: string | null;
	signed_in_at: string;
	last_active_at: string;
	current: boolean;
}

export function useDevices() {
	return useQuery({
		queryKey: ['auth', 'sessions'],
		queryFn: async ({ signal }) => (await api.get<{ data: DeviceDto[] }>('/auth/sessions', { signal })).data,
		enabled: isLiveApi(),
		staleTime: 15_000,
	});
}

/** "Chrome on macOS" from a user-agent string; good enough to recognise your own device. */
export function describeDevice(userAgent: string | null): string {
	if (!userAgent) return 'Unknown device';
	const browser = /Edg\//.test(userAgent) ? 'Edge' : /Firefox\//.test(userAgent) ? 'Firefox' : /Chrome\//.test(userAgent) ? 'Chrome' : /Safari\//.test(userAgent) ? 'Safari' : null;
	const os = /Android/.test(userAgent) ? 'Android' : /iPhone|iPad/.test(userAgent) ? 'iOS' : /Mac OS X/.test(userAgent) ? 'macOS' : /Windows/.test(userAgent) ? 'Windows' : /Linux/.test(userAgent) ? 'Linux' : null;
	if (browser && os) return `${browser} on ${os}`;
	return browser ?? os ?? userAgent.split('/')[0]!.slice(0, 40);
}
