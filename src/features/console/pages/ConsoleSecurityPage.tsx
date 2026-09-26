// Second-factor enrolment.
//
// The round trip, and each half matters:
//
//   1. POST /auth/totp/enrol returns a staged secret. It does nothing yet — it
//      is not enrolled, it is a candidate.
//   2. The operator scans the QR (or types the key) into a real authenticator.
//   3. POST /auth/totp/confirm presents a code generated from that secret. That
//      is what proves the authenticator holds it, and it is why nobody locks
//      themselves out by fat-fingering setup.
//
// Confirming also returns the recovery codes — ten of them, shown exactly once,
// because only their hashes are stored. That is why step 4 below is a gate the
// operator has to pass through, not a toast: there is no second chance to read
// them, and the screen says so before they click rather than after.
//
// What this page never does: put the secret in the query cache, in sessionStorage,
// in the URL, or in a console.log. It lives in this component's state and is
// dropped on confirm, on cancel, and on unmount.

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Check, KeyRound, ShieldCheck } from 'lucide-react';
import { Button, Card, OtpInput } from '@/shared/ui';
import { beginTotpEnrolMutation, confirmTotpEnrolMutation, regenerateBackupCodesMutation } from '../api/mutations';
import { useConsoleStore } from '../store';
import { OtpAuthQr } from '../components/OtpAuthQr';
import { SecretReveal } from '../components/SecretReveal';
import { BackupCodeList } from '../components/BackupCodeList';
import { PageHeader } from '../components/Primitives';
import { ElevationPrompt } from '../components/ElevationPrompt';
import { ConfirmDialog } from '../components/ReasonDialog';
import { refusalMessage, classify } from '../lib/errors';
import { ELEVATION_MINUTES, isElevated, type EnrolmentDraft } from '../model';

type Phase = 'intro' | 'scanning' | 'confirming' | 'recovery';

export function ConsoleSecurityPage() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const operator = useConsoleStore((s) => s.operator);
	const isOperator = operator !== null;
	const refreshOperator = useConsoleStore((s) => s.refreshOperator);
	const setElevatedUntil = useConsoleStore((s) => s.setElevatedUntil);

	const [phase, setPhase] = useState<Phase>('intro');
	const [draft, setDraft] = useState<EnrolmentDraft | null>(null);
	const [code, setCode] = useState('');
	const [error, setError] = useState<string>();
	const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
	// The regenerate flow is two steps: confirm the consequence, then — if the
	// window has closed since — prove yourself. Both are tracked here so the
	// enrolled summary below stays a pure view.
	const [regenerateConfirm, setRegenerateConfirm] = useState(false);
	const [regenerateNeedsCode, setRegenerateNeedsCode] = useState(false);

	// Nothing to see if the operator already has a factor: the enrolment
	// endpoints answer 409, and a QR-less screen saying "already done" is more
	// useful than an error the operator has to interpret.
	const alreadyEnrolled = operator?.totpEnrolled ?? false;
	const elevated = isElevated(operator ?? { elevatedUntil: null });

	useEffect(() => {
		// Leaving the page mid-enrol abandons a staged secret. The server has no
		// expiry on it, so the honest thing is to make starting again explicit
		// rather than leaving a usable seed behind in a state nobody is looking at.
		return () => setDraft(null);
	}, [phase]);

	const begin = useMutation({
		...beginTotpEnrolMutation(),
		onSuccess: (result) => {
			setDraft({ secret: result.secret, otpauthUri: result.otpauth_uri, createdAt: Date.now() });
			setPhase('scanning');
		},
		onError: (err) => setError(refusalMessage(classify(err, isOperator))),
	});

	const confirm = useMutation({
		...confirmTotpEnrolMutation(queryClient),
		onSuccess: (result) => {
			// The seed has done its job. Drop it before anything else so it cannot
			// be re-rendered if this screen is revisited.
			setDraft(null);
			setCode('');
			// Confirming elevates too, so the header countdown starts immediately
			// rather than after the next heartbeat.
			setElevatedUntil(result.elevation_expires_at);
			setBackupCodes(result.backup_codes);
			setPhase('recovery');
			void refreshOperator();
		},
		onError: (err) => {
			setError(refusalMessage(classify(err, isOperator)));
			setCode('');
		},
	});

	const busy = begin.isPending || confirm.isPending;

	// Minting a new set requires a live elevation, and the fresh codes go through
	// the same one-time screen as the originals — they are only hashes on the
	// server either way, so there is no second chance to read them.
	const regenerate = useMutation({
		...regenerateBackupCodesMutation(),
		onSuccess: (result) => {
			setRegenerateConfirm(false);
			setRegenerateNeedsCode(false);
			setBackupCodes(result.backup_codes);
			setPhase('recovery');
		},
		onError: (err) => {
			const refusal = classify(err, isOperator);
			// A closed window is not a failure to report — it is the next step.
			if (refusal.kind === 'elevation' || refusal.kind === 'enrolment') {
				setRegenerateConfirm(false);
				setRegenerateNeedsCode(true);
				return;
			}
			setError(refusalMessage(refusal));
		},
	});

	if (phase === 'recovery' && backupCodes) {
		return <RecoveryCodes codes={backupCodes} onDone={() => navigate({ to: '/console' })} />;
	}

	// Elevation for a regenerate, rather than for reading: the operator is
	// already enrolled, so this is the one place the page needs to ask twice.
	if (regenerateNeedsCode) {
		return <ElevationPrompt reason="Recovery codes can only be replaced inside an active window. Enter a code to continue." onCancel={() => setRegenerateNeedsCode(false)} />;
	}

	return (
		<>
			<PageHeader
				title="Security"
				sub={
					alreadyEnrolled
						? 'Your second factor is enrolled. Every action in this console is checked against it.'
						: 'The console will not do anything until an authenticator app is enrolled. It takes about a minute.'
				}
			/>

			{alreadyEnrolled && phase === 'intro' ? (
				<EnrolledSummary elevated={elevated} busy={regenerate.isPending} onRegenerate={() => setRegenerateConfirm(true)} onBack={() => navigate({ to: '/console' })} />
			) : null}

			{phase === 'intro' && !alreadyEnrolled ? (
				<Card className="max-w-[560px] p-7">
					<span className="grid size-10 place-items-center rounded-full bg-brand-100 text-brand-900">
						<ShieldCheck size={20} />
					</span>
					<h2 className="mt-4 text-base font-semibold text-t1">Add an authenticator app</h2>
					<p className="mt-2 text-[13px] leading-relaxed text-t2">
						You will scan a QR code with an app that generates time-based codes. Aegis, 1Password, Bitwarden, Google
						Authenticator and Authy all work. When it is set up you will be asked for a code every{' '}
						{ELEVATION_MINUTES} minutes.
					</p>

					<ol className="mt-4 space-y-2 text-[13px] leading-relaxed text-t2">
						<li className="flex gap-2.5">
							<b className="text-t1">1.</b> Open your authenticator app and add a new time-based entry.
						</li>
						<li className="flex gap-2.5">
							<b className="text-t1">2.</b> Scan the code on the next screen.
						</li>
						<li className="flex gap-2.5">
							<b className="text-t1">3.</b> Type the code it shows to finish. We will also give you ten recovery codes.
						</li>
					</ol>

					{error ? (
						<p role="alert" className="mt-4 text-xs text-danger">
							{error}
						</p>
					) : null}

					<Button variant="primary" size="lg" className="mt-6" loading={busy} onClick={() => begin.mutate()} block>
						<KeyRound size={15} />
						Set up an authenticator
					</Button>
				</Card>
			) : null}

			{phase === 'scanning' && draft ? (				<Card className="max-w-[620px] p-7">
					<h2 className="text-base font-semibold text-t1">Scan this with your authenticator</h2>
					<p className="mt-1.5 text-[13px] text-t2">It should appear as an entry called Ledge.</p>

					<div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-start">
						<div className="mx-auto sm:mx-0">
							<OtpAuthQr uri={draft.otpauthUri} />
						</div>
						<div className="min-w-0 flex-1">
							<SecretReveal uri={draft.otpauthUri} />
							<p className="mt-4 text-[11px] leading-relaxed text-t3">
								The QR is drawn in this browser. It is never sent anywhere, and neither is the key above.
							</p>
						</div>
					</div>

					<div className="mt-6 border-t border-border pt-5">
						<label htmlFor="enrol-code" className="mb-2 block text-xs font-semibold text-t2">
							Enter the code your app is showing
						</label>
						<OtpInput value={code} onChange={setCode} invalid={!!error} disabled={busy} />
						<input id="enrol-code" className="sr-only" value={code} readOnly tabIndex={-1} autoComplete="one-time-code" aria-hidden />

						{error ? (
							<p role="alert" className="mt-3 text-xs text-danger">
								{error}
							</p>
						) : null}

						<div className="mt-5 flex items-center gap-2">
							<Button
								variant="primary"
								size="lg"
								loading={busy}
								disabled={code.length < 6}
								onClick={() => {
									setError(undefined);
									confirm.mutate(code.trim());
								}}
							>
								<Check size={15} />
								Confirm and finish
							</Button>
							<Button
								variant="ghost"
								size="lg"
								disabled={busy}
								onClick={() => {
									// A fresh start re-stages a new secret server-side, which is
									// what "start over" has to mean. Restarting enrolment is
									// cheap; the operator is not enrolled either way.
									setDraft(null);
									setCode('');
									setError(undefined);
									begin.mutate();
								}}
							>
								That code did not work — start over
							</Button>
						</div>
					</div>
				</Card>
			) : null}
			{regenerateConfirm ? (
				<ConfirmDialog
					open
					title="Replace your recovery codes"
					// The old set stops working the moment the new one is minted, and
					// the old one is not shown again — so the operator has to be sure
					// before clicking, not after.
					body="Your current recovery codes will stop working immediately, and they cannot be shown again. The new set is displayed once, right after. Make sure you can read them before you start."
					confirmLabel="Replace them"
					busy={regenerate.isPending}
					error={error}
					onCancel={() => {
						setRegenerateConfirm(false);
						setError(undefined);
					}}
					onConfirm={() => {
						setError(undefined);
						regenerate.mutate();
					}}
				/>
			) : null}
		</>
	);
}

/** The already-enrolled state, including replacing a lost set of recovery codes. */
function EnrolledSummary({ elevated, busy, onRegenerate, onBack }: { elevated: boolean; busy: boolean; onRegenerate: () => void; onBack: () => void }) {
	return (
		<Card className="max-w-[560px] p-7">
			<div className="flex items-center gap-3">
				<span className="grid size-10 place-items-center rounded-full bg-success-bg text-success-fg">
					<ShieldCheck size={20} />
				</span>
				<div>
					<h2 className="text-sm font-semibold text-t1">Authenticator enrolled</h2>
					<p className="text-xs text-t2">Codes are checked for {ELEVATION_MINUTES} minutes at a time.</p>
				</div>
			</div>

			<p className="mt-4 text-[13px] leading-relaxed text-t2">
				Recovery codes let you in if you lose your phone. They are shown once, at the moment they are generated.
			</p>

			<div className="mt-5 flex flex-wrap items-center gap-2">
				<Button variant="secondary" loading={busy} onClick={onRegenerate}>
					Generate a new set
				</Button>
				<Button variant="ghost" onClick={onBack}>
					Back to the console
				</Button>
			</div>

			{/* The endpoint needs elevation, so the button says so rather than
			    failing on click. The header countdown shows what is left. */}
			{!elevated ? <p className="mt-3 text-[11px] leading-relaxed text-t3">Replacing codes needs an active window — verify with a code first.</p> : null}
		</Card>
	);
}

/**
 * The recovery codes, and the only chance to read them.
 *
 * No countdown, no "are you sure" — a timer here would be a way to lose ten
 * codes, and the codes are the only way back into an account whose phone is in
 * a river. The acknowledgement checkbox is the gate, and it is not skippable.
 */
function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
	const [acknowledged, setAcknowledged] = useState(false);

	return (
		<Card className="max-w-[620px] p-7">
			<h2 className="text-base font-semibold text-t1">Save your recovery codes</h2>
			<p className="mt-2 text-[13px] leading-relaxed text-t2">
				These are the only way back into the console if you lose your authenticator. Each one works once. We store only a
				hash of each, so <b>nobody — including us — can show you these again</b>.
			</p>

			<BackupCodeList codes={codes} className="mt-5" />

			<label className="mt-5 flex cursor-pointer items-start gap-2.5 text-[13px] text-t1">
				<input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-brand-900" />
				<span>I have saved these somewhere I will not lose them.</span>
			</label>

			<Button variant="primary" size="lg" className="mt-5" disabled={!acknowledged} onClick={onDone} block>
				Finish
			</Button>
		</Card>
	);
}
