import { useAuthStore } from '@/shared/lib/auth-store';

/** The signed-in user as a mutation actor. */
export function useActor() {
	const user = useAuthStore((s) => s.user);
	return { id: user?.id ?? 'anon', name: user?.name ?? 'Someone' };
}
