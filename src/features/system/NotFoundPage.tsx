import { Link } from '@tanstack/react-router';
import { Button, Wordmark } from '@/shared/ui';
import { useAuthStore, selectIsAuthed } from '@/shared/lib/auth-store';

export function NotFoundPage() {
	const authed = useAuthStore(selectIsAuthed);
	const org = useAuthStore((s) => s.org);
	return (
		<div className="flex min-h-full flex-col items-center justify-center px-4 py-12 text-center">
			<Wordmark light={false} className="mb-8" />
			<p className="text-[11px] font-semibold tracking-wider text-t3 uppercase">404</p>
			<h1 className="mt-1 text-2xl font-semibold">We couldn't find that page</h1>
			<p className="mt-2 max-w-sm text-[13px] text-t2">The link may be out of date, or the page may have moved to a different organisation.</p>
			<div className="mt-6">
				{authed && org ? (
					<Link to="/$org/dashboard" params={{ org: org.slug }}>
						<Button variant="primary">Go to dashboard</Button>
					</Link>
				) : (
					<Link to="/login" search={{}}>
						<Button variant="primary">Sign in</Button>
					</Link>
				)}
			</div>
		</div>
	);
}
