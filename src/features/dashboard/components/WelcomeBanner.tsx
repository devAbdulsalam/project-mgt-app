import { Link } from '@tanstack/react-router';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useUiStore } from '@/shared/lib/ui-store';
import type { Org, User } from '@/mocks/data';

export function WelcomeBanner({ org, user, invitesJustSent }: { org: Org; user: User; invitesJustSent?: number }) {
	const dismissed = useUiStore((s) => s.bannerDismissed);
	const dismiss = useUiStore((s) => s.dismissBanner);
	if (dismissed || org.trialDaysLeft <= 0) return null;
	const firstName = user.name.split(' ')[0];
	const invitesLine =
		invitesJustSent != null ? `${invitesJustSent} invite${invitesJustSent === 1 ? '' : 's'} sent` : `${org.invitesAccepted} of ${org.invitesSent} invites accepted`;
	return (
		<div className="flex items-center gap-3 rounded-md bg-[linear-gradient(90deg,var(--color-brand-900),var(--color-brand-700))] px-4 py-3.5 text-white sm:gap-4 sm:px-5" role="status">
			<Sparkles size={20} className="hidden shrink-0 sm:block" aria-hidden />
			<div className="min-w-0 flex-1">
				<b className="block truncate">Welcome, {firstName} — your workspace is live.</b>
				<div className="truncate text-[11px] text-on-dark-muted">
					Trial: {org.trialDaysLeft} days left · {invitesLine} · WhatsApp number connected
				</div>
			</div>
			<span className="hidden text-xs text-on-dark-muted md:block">
				<b className="text-white">
					{org.setupStepsDone}/{org.setupStepsTotal}
				</b>{' '}
				setup steps
			</span>
			<Link to="/$org/settings" params={{ org: org.slug }} className="hidden sm:inline-flex">
				<Button size="sm" className="border-white bg-white text-brand-900 hover:bg-brand-100">
					Finish setup
				</Button>
			</Link>
			<button type="button" onClick={dismiss} className="text-on-dark-muted hover:text-white" aria-label="Dismiss welcome banner">
				<X size={16} />
			</button>
		</div>
	);
}
