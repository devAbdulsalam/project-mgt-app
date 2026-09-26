// The "say why" dialog.
//
// Disabling an account, suspending a workspace and revoking an operator's
// standing are all the same shape: the server takes a reason, and the absence of
// one is how you undo it (backend/src/platform/routes.ts, reasonSchema). That
// asymmetry is deliberate — the database also refuses to suspend without a
// reason — so the UI has to make the reason feel like part of the action rather
// than a form field to satisfy.
//
// The reason is shown in the audit trail afterwards, to the operator's
// colleagues. "Locked them out" is not a reason; a sentence naming what happened
// is. So the dialog asks for a sentence, and says where it will be read.

import { useState } from 'react';
import { Button, Dialog, Field, Input } from '@/shared/ui';

export interface ReasonRequest {
	title: string;
	/** What will happen, in the operator's terms. */
	intro: string;
	/** The verb on the confirm button — "Disable", "Suspend", "Revoke". */
	confirmLabel: string;
	/** Pre-filled, for the restore case. */
	initial?: string;
	/** Longest the server will store. */
	maxLength?: number;
}

export function ReasonDialog({ request, busy, error, onCancel, onConfirm }: { request: ReasonRequest | null; busy?: boolean; error?: string; onCancel: () => void; onConfirm: (reason: string) => void }) {
	const [reason, setReason] = useState('');
	const [shown, setShown] = useState<ReasonRequest | null>(null);

	// Reset on open, so a previous failure's text is not offered again as a
	// default and no stale reason is one Enter away from being submitted.
	//
	// Adjusted during render rather than in an effect: an effect would run *after*
	// the first paint of the new dialog, so the operator would see their previous
	// reason flash past before it cleared. React documents this as the way to
	// correct state when a prop changes during render.
	if (request !== shown) {
		setShown(request);
		setReason(request?.initial ?? '');
	}

	if (!request) return null;

	const trimmed = reason.trim();
	// 3 is the server's floor (reasonSchema: min(3)), enforced here so the
	// button reflects it rather than letting the round trip explain it.
	const tooShort = trimmed.length > 0 && trimmed.length < 3;

	return (
		<Dialog
			open
			onClose={onCancel}
			title={request.title}
			width="max-w-[480px]"
			footer={
				<div className="flex items-center justify-end gap-2">
					<Button variant="ghost" onClick={onCancel} disabled={busy}>
						Cancel
					</Button>
					<Button variant="danger" loading={busy} disabled={trimmed.length < 3} onClick={() => onConfirm(trimmed)}>
						{request.confirmLabel}
					</Button>
				</div>
			}
		>
			<div className="px-5 py-5 sm:px-7">
				<p className="text-[13px] leading-relaxed text-t2">{request.intro}</p>

				<form
					className="mt-4"
					onSubmit={(e) => {
						e.preventDefault();
						if (trimmed.length >= 3 && !busy) onConfirm(trimmed);
					}}
				>
					<Field label="Reason" required hint="visible to other operators in the audit trail" error={tooShort ? 'Give at least a few words.' : undefined}>
						{(id, describedBy) => (
							<Input
								id={id}
								aria-describedby={describedBy}
								autoFocus
								value={reason}
								maxLength={request.maxLength ?? 500}
								onChange={(e) => setReason(e.target.value)}
								placeholder="e.g. Reported compromised by their own workspace owner"
								invalid={tooShort}
							/>
						)}
					</Field>
				</form>

				{error ? (
					<p role="alert" className="mt-3 text-xs text-danger">
						{error}
					</p>
				) : null}
			</div>
		</Dialog>
	);
}

/**
 * The undo case, which is the mirror of the dialog above.
 *
 * Restoring something needs no reason — the server treats a null reason as "off"
 * — so this is a plain confirm with the thing named, not a second form.
 */
export function ConfirmDialog({
	open,
	title,
	body,
	confirmLabel,
	busy,
	error,
	danger = true,
	onCancel,
	onConfirm,
}: {
	open: boolean;
	title: string;
	body: string;
	confirmLabel: string;
	busy?: boolean;
	error?: string;
	danger?: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	return (
		<Dialog
			open={open}
			onClose={onCancel}
			title={title}
			width="max-w-[440px]"
			footer={
				<div className="flex items-center justify-end gap-2">
					<Button variant="ghost" onClick={onCancel} disabled={busy}>
						Cancel
					</Button>
					<Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>
						{confirmLabel}
					</Button>
				</div>
			}
		>
			<div className="px-5 py-5 sm:px-7">
				<p className="text-[13px] leading-relaxed text-t2">{body}</p>
				{error ? (
					<p role="alert" className="mt-3 text-xs text-danger">
						{error}
					</p>
				) : null}
			</div>
		</Dialog>
	);
}
