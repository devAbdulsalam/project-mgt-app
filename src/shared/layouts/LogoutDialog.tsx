import { useNavigate } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';
import { Avatar, Button, Dialog } from '@/shared/ui';
import { useAuthStore } from '@/shared/lib/auth-store';

/**
 * Confirmation step in front of every sign-out entry point, so a stray tap on
 * "Sign out" doesn't end the session. `onDone` lets the caller dismiss its own
 * menu or drawer once the user has actually committed.
 */
export function LogoutDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone?: () => void }) {
	const user = useAuthStore((s) => s.user);
	const logout = useAuthStore((s) => s.logout);
	const navigate = useNavigate();

	const confirm = () => {
		onClose();
		onDone?.();
		logout();
		navigate({ to: '/login', search: {} });
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title="Sign out?"
			width="max-w-[420px]"
			footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Stay signed in</Button><Button variant="danger" onClick={confirm}><LogOut size={15} aria-hidden /> Sign out</Button></div>}
		>
			<div className="px-5 py-5 sm:px-7">
				{user ? (
					<div className="flex items-center gap-3 rounded-md bg-muted p-3">
						<Avatar name={user.name} src={user.avatarUrl} size="lg" />
						<span className="min-w-0">
							<b className="block truncate text-[13px]">{user.name}</b>
							<span className="block truncate text-xs text-t2">{user.email}</span>
						</span>
					</div>
				) : null}
				<p className="mt-3 text-[13px] leading-relaxed text-t2">
					You&rsquo;ll be taken back to the login screen. Anything typed but not saved &mdash; draft replies, open forms &mdash; will be lost.
				</p>
			</div>
		</Dialog>
	);
}
