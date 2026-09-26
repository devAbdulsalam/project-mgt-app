// Workspace members as the API reports them, in the app's `TeamMember` shape.
//
// `memberById` is a plain function called from render code all over the app, so
// live members are held in a store it can read synchronously. `MemberDirectoryGate`
// fills it before any page renders.

import { create } from 'zustand';
import type { MemberRole, Tint, TeamMember } from '@/mocks/types';
import type { MemberDto } from '@/api/resources';

const TINTS: Tint[] = ['teal', 'tan', 'green', 'lavender', 'grey'];

const ROLE_LABEL: Record<string, MemberRole> = {
	owner: 'Admin',
	admin: 'Admin',
	member: 'Engineer',
	viewer: 'Viewer',
};

/** Stable per person, so an avatar keeps its colour between visits. */
function tintFor(id: string): Tint {
	let hash = 0;
	for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
	return TINTS[hash % TINTS.length]!;
}

export function memberDtoToDomain(dto: MemberDto): TeamMember {
	return {
		id: dto.id,
		name: dto.name,
		role: ROLE_LABEL[dto.role] ?? 'Engineer',
		email: dto.email,
		tint: tintFor(dto.id),
		avatarUrl: dto.avatar_url ?? undefined,
		base: '',
		team: '',
		presence: 'Active',
		status: dto.status === 'active' ? 'Active' : dto.status === 'invited' ? 'Invited' : 'Deactivated',
		accessRole: dto.role as TeamMember['accessRole'],
		phone: dto.phone ?? undefined,
		lastActiveAt: dto.last_active_at ? Date.parse(dto.last_active_at) : undefined,
		joinedAt: dto.status === 'invited' || !dto.joined_at ? undefined : Date.parse(dto.joined_at),
		invitedAt: dto.status === 'invited' && dto.joined_at ? Date.parse(dto.joined_at) : undefined,
		skills: [],
		teams: [],
	};
}

interface DirectoryState {
	members: TeamMember[];
	set: (members: TeamMember[]) => void;
}

export const useMemberDirectory = create<DirectoryState>((set) => ({
	members: [],
	set: (members) => set({ members }),
}));
