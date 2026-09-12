import { Link } from '@tanstack/react-router';
import { Construction, ChevronLeft } from 'lucide-react';
import { AppShell, MobileHeader } from '@/shared/layouts/AppShell';
import { Button } from '@/shared/ui';
import { useAuthStore } from '@/shared/lib/auth-store';
import { sidebarNav } from '@/shared/layouts/nav';

/** Stub for routes in the plan that are not built yet. */
export function PlaceholderPage({ section }: { section: string }) {
	const org = useAuthStore((s) => s.org)!;
	const item = sidebarNav.find((n) => n.to === section);
	const title = item?.label ?? section[0]!.toUpperCase() + section.slice(1);
	return (
		<AppShell
			meta={{ title, subtitle: org.name }}
			mobileHeader={
				<MobileHeader>
					<div className="text-xl font-semibold">{title}</div>
				</MobileHeader>
			}
		>
			<div className="card mx-auto mt-6 max-w-md p-8 text-center">
				<span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-brand-100 text-brand-900">
					{item ? <item.icon size={22} aria-hidden /> : <Construction size={22} aria-hidden />}
				</span>
				<h2 className="text-lg font-semibold">{title} is next on the roadmap</h2>
				<p className="mt-1.5 text-[13px] text-t2">This section is scaffolded but not built yet. The dashboard and auth flows are live with mock data.</p>
				<Link to="/$org/dashboard" params={{ org: org.slug }} className="mt-5 inline-block">
					<Button variant="primary">
						<ChevronLeft size={14} aria-hidden /> Back to dashboard
					</Button>
				</Link>
			</div>
		</AppShell>
	);
}
