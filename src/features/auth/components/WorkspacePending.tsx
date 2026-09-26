import { Link } from '@tanstack/react-router';
import { Building2, CheckCircle2, Mail } from 'lucide-react';
import { AuthHeading } from './AuthHeading';

/**
 * Shown when the account exists but has no workspace to enter.
 *
 * Creating an organisation is an operator action on this platform — there is no
 * self-serve endpoint for it — so a signup that did not come from an invitation
 * genuinely stops here. Saying that is better than walking the person through
 * two more setup steps and landing them somewhere that does not exist.
 */
export function WorkspacePending({ email }: { email: string }) {
	return (
		<>
			<AuthHeading title="Your account is ready">There is no workspace attached to it yet.</AuthHeading>

			<div className="space-y-3.5">
				<div className="flex items-start gap-3 rounded-[10px] border border-border-strong bg-white p-4">
					<span className="grid size-8 shrink-0 place-items-center rounded-sm bg-brand-100 text-brand-900">
						<CheckCircle2 size={16} aria-hidden />
					</span>
					<span className="min-w-0 text-[13px]">
						<b className="block">Account created and verified</b>
						<span className="mt-0.5 block text-t2">{email}</span>
					</span>
				</div>

				<div className="flex items-start gap-3 rounded-[10px] border border-border-strong bg-white p-4">
					<span className="grid size-8 shrink-0 place-items-center rounded-sm bg-muted text-t2">
						<Building2 size={16} aria-hidden />
					</span>
					<span className="min-w-0 text-[13px]">
						<b className="block">Workspace pending</b>
						<span className="mt-0.5 block text-t2">Workspaces are created by the Ledge team. We will set yours up and email you when it is ready.</span>
					</span>
				</div>

				<div className="flex items-start gap-3 rounded-[10px] border border-border-strong bg-white p-4">
					<span className="grid size-8 shrink-0 place-items-center rounded-sm bg-muted text-t2">
						<Mail size={16} aria-hidden />
					</span>
					<span className="min-w-0 text-[13px]">
						<b className="block">Already been invited?</b>
						<span className="mt-0.5 block text-t2">Sign in and the invitation is accepted automatically.</span>
					</span>
				</div>
			</div>

			<Link
				to="/login"
				search={{}}
				className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-sm border border-brand-900 bg-brand-900 text-sm font-medium text-white transition-colors hover:border-brand-800 hover:bg-brand-800"
			>
				Go to sign in
			</Link>
		</>
	);
}
