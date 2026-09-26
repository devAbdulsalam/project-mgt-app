import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuthStore } from '@/shared/lib/auth-store';

interface Props {
	/** Where a visitor who is not signed in goes. */
	to: 'login' | 'signup';
	className?: string;
	children: ReactNode;
	/** What a signed-in visitor sees instead. */
	signedInLabel?: ReactNode;
}

/**
 * A sign-in or sign-up link that knows when there is nothing to sign in to:
 * someone with a live session goes straight to their dashboard.
 */
export function AuthLink({ to, className, children, signedInLabel = 'Dashboard' }: Props) {
	const org = useAuthStore((s) => (s.status === 'authenticated' ? s.org : null));

	if (org) {
		return (
			<Link to="/$org/dashboard" params={{ org: org.slug }} search={{}} className={className}>
				{signedInLabel}
			</Link>
		);
	}
	return to === 'login' ? (
		<Link to="/login" search={{}} className={className}>{children}</Link>
	) : (
		<Link to="/signup" className={className}>{children}</Link>
	);
}
