// The "prove it's you" screen.
//
// Shown whenever the server says `elevation_required`. One field takes either a
// six-digit TOTP code or a single recovery code, because the server accepts both
// in the same parameter and the operator should not have to know which they are
// holding — that distinction is exactly the thing a support conversation should
// not be teaching.
//
// Two details that matter:
//
//   - The server counts *failures*, not attempts, and allows ten per fifteen
//     minutes. So a correct code is never throttled and a guesser is stopped
//     fast. The client mirrors the shape but not the limit: it does not
//     pre-count, because a client-side counter that disagrees with the server's
//     is worse than none.
//   - A failure clears the field. A half-typed wrong code left on screen is an
//     invitation to edit one digit of it and submit again, which is how a
//     six-digit space gets walked down.

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, ShieldAlert } from 'lucide-react';
import { Button, Card, OtpInput } from '@/shared/ui';
import { elevateMutation } from '../api/mutations';
import { operatorKeys } from '../api/keys';
import { useConsoleStore } from '../store';
import { refusalMessage, classify } from '../lib/errors';
import { ELEVATION_MINUTES } from '../model';

export function ElevationPrompt({ reason, onCancel }: { reason?: string; onCancel?: () => void }) {
	const queryClient = useQueryClient();
	const isOperator = useConsoleStore((s) => s.operator !== null);
	const setElevatedUntil = useConsoleStore((s) => s.setElevatedUntil);
	const [code, setCode] = useState('');
	const [error, setError] = useState<string>();

	const elevate = useMutation({
		...elevateMutation(queryClient),
		onSuccess: (result) => {
			// Apply the server's expiry immediately rather than waiting for the
			// 30s heartbeat: the operator has just proved themselves and should
			// not watch a stale "not elevated" state for half a minute.
			setElevatedUntil(result.expires_at);
			void queryClient.invalidateQueries({ queryKey: operatorKeys.me() });
		},
		onError: (err) => {
			setError(refusalMessage(classify(err, isOperator)));
			setCode('');
		},
	});

	const submit = () => {
		const trimmed = code.trim();
		if (!trimmed || elevate.isPending) return;
		setError(undefined);
		elevate.mutate(trimmed);
	};

	const busy = elevate.isPending;

	return (
		<div className="grid min-h-[100dvh] place-items-center bg-muted px-5 py-10">
			<Card className="w-full max-w-[440px] p-7">
				<div className="flex items-center gap-2.5">
					<span className="grid size-9 place-items-center rounded-full bg-brand-100 text-brand-900">
						<ShieldAlert size={18} />
					</span>
					<div>
						<h1 className="text-base font-semibold text-t1">Confirm it&apos;s you</h1>
						<p className="text-xs text-t2">Operator actions need a second factor.</p>
					</div>
				</div>

				<p className="mt-4 text-[13px] leading-relaxed text-t2">
					{reason ?? 'Enter the current code from your authenticator app to continue. Verification lasts 30 minutes.'}
				</p>

				<form
					className="mt-5"
					onSubmit={(e) => {
						e.preventDefault();
						submit();
					}}
				>
					<label htmlFor="elevation-code" className="mb-2 block text-xs font-semibold text-t2">
						Authenticator or recovery code
					</label>
					<OtpInput value={code} onChange={setCode} length={11} invalid={!!error} disabled={busy} />
					{/*
					 * The visible label is for the group as a whole; OtpInput renders
					 * one input per character with its own aria-label, so a visible
					 * input here would be a second, redundant control for a screen
					 * reader. Kept in the DOM for the click target and the autofill.
					*/}
					<input id="elevation-code" className="sr-only" value={code} readOnly tabIndex={-1} autoComplete="one-time-code" aria-hidden />

					{error ? (
						<p role="alert" className="mt-3 text-xs text-danger">
							{error}
						</p>
					) : null}

					<div className="mt-5 flex items-center gap-2">
						<Button type="submit" variant="primary" size="lg" loading={busy} disabled={!code.trim()} block>
							<KeyRound size={15} />
							Verify
						</Button>
						{onCancel ? (
							<Button type="button" variant="ghost" size="lg" onClick={onCancel} disabled={busy}>
								Cancel
							</Button>
						) : null}
					</div>
				</form>

				<p className="mt-5 text-[11px] leading-relaxed text-t3">
					No phone to hand? Use a recovery code — it works in the same box and can only be used once. Codes are valid
					for {ELEVATION_MINUTES} minutes, after which you&apos;ll be asked again.
				</p>
			</Card>
		</div>
	);
}
