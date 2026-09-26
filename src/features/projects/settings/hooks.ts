import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/api';
import { useProject as useProjectQuery } from '@/api/resources';
import { toast } from '@/shared/lib/toast-store';
import { useAuthStore } from '@/shared/lib/auth-store';
import { isLiveApi } from '@/shared/lib/live-api';
import { useMemberDirectory } from '@/shared/lib/member-directory';
import { useDb } from '@/mocks/db';
import type { Project, ProjectSettings, TeamMember } from '@/mocks/types';
import { resolveSettings, sectionLabel } from './model';

// -- Wire shape -------------------------------------------------------------
//
// The API names its top-level sections and the `general` fields in snake_case;
// what is inside the other sections is the client's own document and is stored
// as-is. Only the names the API knows are translated here.

interface SettingsWire {
	general?: {
		default_assignee: ProjectSettings['general']['defaultAssignee'];
		visibility: ProjectSettings['general']['visibility'];
		start_day: ProjectSettings['general']['startDay'];
		working_days: number;
		focus_hours_per_day: number;
		client_visible: boolean;
	};
	workflow?: ProjectSettings['workflow'];
	fields?: ProjectSettings['fields'];
	boards?: ProjectSettings['boards'];
	ticket_types?: ProjectSettings['ticketTypes'];
	roles?: ProjectSettings['roles'];
	automation?: ProjectSettings['automation'];
	notifications?: ProjectSettings['notifications'];
	integrations?: ProjectSettings['integrations'];
}

function fromWire(wire: SettingsWire): Partial<ProjectSettings> {
	const { general, ticket_types: ticketTypes, ...rest } = wire;
	return {
		...rest,
		...(ticketTypes ? { ticketTypes } : {}),
		...(general
			? {
					general: {
						defaultAssignee: general.default_assignee,
						visibility: general.visibility,
						startDay: general.start_day,
						workingDays: general.working_days,
						focusHoursPerDay: general.focus_hours_per_day,
						clientVisible: general.client_visible,
					},
				}
			: {}),
	};
}

function toWire(patch: Partial<ProjectSettings>): SettingsWire {
	const { general, ticketTypes, ...rest } = patch;
	return {
		...rest,
		...(ticketTypes ? { ticket_types: ticketTypes } : {}),
		...(general
			? {
					general: {
						default_assignee: general.defaultAssignee,
						visibility: general.visibility,
						start_day: general.startDay,
						working_days: general.workingDays,
						focus_hours_per_day: general.focusHoursPerDay,
						client_visible: general.clientVisible,
					},
				}
			: {}),
	};
}

const settingsKey = (org: string, projectKey: string) => ['org', org, 'project-settings', projectKey] as const;

/** Effective settings for a project (stored values over defaults), stable per project identity. */
export function useProjectSettings(project: Project) {
	const live = isLiveApi();
	const org = useAuthStore((s) => s.org?.slug ?? '');
	const query = useQuery({
		queryKey: settingsKey(org, project.key),
		queryFn: ({ signal }) => api.get<SettingsWire>(`/orgs/${org}/projects/${project.key}/settings`, { signal }),
		enabled: live && Boolean(org),
		staleTime: 30_000,
	});
	return useMemo(
		() => resolveSettings(live && query.data ? { ...project, settings: fromWire(query.data) as ProjectSettings } : project),
		[project, live, query.data],
	);
}

/** Saves whole sections: to the API when live, to the mock store otherwise. */
export function useSaveProjectSettings(project: Project) {
	const live = isLiveApi();
	const org = useAuthStore((s) => s.org?.slug ?? '');
	const queryClient = useQueryClient();
	const updateProject = useDb((s) => s.updateProject);
	const current = useProjectSettings(project);

	return useCallback(
		(patch: Partial<ProjectSettings>) => {
			if (!live) {
				updateProject(project.id, { settings: { ...current, ...patch } });
				return;
			}
			const key = settingsKey(org, project.key);
			const wire = toWire(patch);
			// Optimistic, so the form does not flash back to the old value while the
			// request is in flight; the response (or a refetch on failure) is the truth.
			queryClient.setQueryData<SettingsWire>(key, (old) => ({ ...old, ...wire }));
			api
				.patch<SettingsWire>(`/orgs/${org}/projects/${project.key}/settings`, { json: wire })
				.then((saved) => queryClient.setQueryData(key, saved))
				.catch((err: unknown) => {
					toast(err instanceof ApiError ? err.message : 'Could not save the project settings.', { tone: 'danger' });
					void queryClient.invalidateQueries({ queryKey: key });
				});
		},
		[live, org, project.id, project.key, current, queryClient, updateProject],
	);
}

/** Local draft of one settings slice with explicit save, mirroring the org settings page. */
export function useSectionDraft<K extends keyof ProjectSettings>(project: Project, section: K) {
	const settings = useProjectSettings(project);
	const value = settings[section];
	const saveSettings = useSaveProjectSettings(project);
	const [draft, setDraft] = useState<ProjectSettings[K]>(value);
	const [base, setBase] = useState(value);
	if (base !== value) {
		setBase(value);
		setDraft(value);
	}
	const dirty = JSON.stringify(draft) !== JSON.stringify(value);
	const commit = (next: ProjectSettings[K], message?: string) => {
		saveSettings({ [section]: next } as Partial<ProjectSettings>);
		if (message) toast(message, { tone: 'success' });
	};
	const save = () => {
		commit(draft);
		toast('Project settings saved', { tone: 'success', description: `${sectionLabel(section)} updated · logged to audit.` });
	};
	const discard = () => setDraft(value);
	return { settings, draft, setDraft, dirty, save, discard, commit };
}

/** Everyone who could be added to a project. */
export function useWorkspaceMembers(): TeamMember[] {
	const mock = useDb((s) => s.members);
	const live = useMemberDirectory((s) => s.members);
	return isLiveApi() ? live : mock;
}

/** How many issues the project holds, for the delete confirmation. */
export function useProjectTicketCount(project: Project): number {
	const org = useAuthStore((s) => s.org?.slug ?? '');
	const mock = useDb((s) => s.tickets.filter((t) => t.projectKey === project.key).length);
	const query = useProjectQuery(org, project.key);
	return isLiveApi() ? (query.data?.total_count ?? 0) : mock;
}
