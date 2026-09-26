// The setup key, for operators whose authenticator cannot use a camera.
//
// This is the same seed the QR carries, so it is treated as a secret:
//
//   - hidden until asked for, because a screen-share or a screenshot of the
//     enrolment page should not hand over a second factor;
//   - never logged, never put in a URL, never in the query cache;
//   - masked in the DOM by default so shoulder-surfing and screen sharing both
//     fail closed.
//
// The `select-all on focus` is the small courtesy that makes the manual path
// usable: without it, clicking the field places a caret and the first keystroke
// destroys the seed the operator was reading.

import { useState } from 'react';
import { Check, Copy, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useCopy } from '../lib/clipboard';
import { formatSecret, parseOtpAuthUri, periodLabel } from '../lib/otpauth';

export function SecretReveal({ uri }: { uri: string }) {
	const [shown, setShown] = useState(false);
	const { copied, copy } = useCopy();

	const parsed = parseOtpAuthUri(uri);
	if (!parsed.ok) return null;
	const { secret, account, issuer, digits, period } = parsed.value;
	const pretty = formatSecret(secret);

	return (
		<div className="rounded-[10px] border border-border bg-muted/60 p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="text-xs font-semibold text-t1">Can&apos;t scan? Type this key instead</p>
					<p className="mt-0.5 text-[11px] text-t2">
						In your authenticator, choose <b>Enter setup key</b> and paste {account ? <b>{account}</b> : 'the account'}.{' '}
						{digits} digits, {periodLabel(period)}.
					</p>
				</div>
				<Button size="sm" variant="ghost" iconOnly onClick={() => setShown((s) => !s)} aria-label={shown ? 'Hide the setup key' : 'Show the setup key'} title={shown ? 'Hide' : 'Show'}>
					{shown ? <EyeOff size={15} /> : <Eye size={15} />}
				</Button>
			</div>

			<div className="mt-3 flex items-center gap-2">
				{/*
				 * A readOnly <input> rather than <code>: select() is what makes the
				 * manual path usable — clicking the field selects the whole key so
				 * it can be pasted straight in — and only a form control has it.
				 * readOnly keeps it out of tab order semantics for editing while
				 * still focusable, and `select on focus` means a click never plants a
				 * caret that would eat the first character typed.
				 */}
				<input
					readOnly
					tabIndex={0}
					value={pretty}
					onFocus={(e) => e.currentTarget.select()}
					className="min-w-0 flex-1 rounded-sm border border-border-strong bg-white px-3 py-2 font-mono text-[13px] tracking-wider text-t1 select-all"
					style={shown ? undefined : ({ WebkitTextSecurity: 'disc', textSecurity: 'disc' } as React.CSSProperties)}
					aria-label="Authenticator setup key"
				/>
				<Button size="md" variant="secondary" onClick={() => void copy(secret)}>
					{/* Copies the un-grouped secret, not the spaced `pretty` form: an
					    authenticator's manual-entry field does not want the spaces. */}
					{copied ? <Check size={15} /> : <Copy size={15} />}
					{copied ? 'Copied' : 'Copy'}
				</Button>
			</div>

			<p className="mt-2.5 text-[11px] text-t3">
				{issuer ? `Issued by ${issuer}. ` : ''}
				Treat this key like a password: anyone who has it can sign in to the console with your codes.
			</p>
		</div>
	);
}
