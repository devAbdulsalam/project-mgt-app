// Reading an `otpauth://` URI apart, for display only.
//
// The console never *generates* a code and never holds a seed beyond the moment
// of enrolment, so nothing here computes TOTP. This exists so the enrolment
// screen can tell the operator what they are about to add ("Ledge —
// dev@steamledge.com, 6 digits, 30 seconds") instead of showing an opaque blob,
// and so the manual-entry fallback can be checked before it is typed into an
// authenticator by hand.
//
// Parsing is defensive on purpose. The URI arrives from the server, but a
// console that renders attacker-influenced strings as text is a console that
// can be used to phish an operator, and the React children escaping this file
// returns is the last line of that defence. Nothing here returns markup.

/** The parameters this console understands. Everything else is ignored on purpose. */
export interface OtpAuth {
	/** Issuer, e.g. "Ledge". */
	issuer: string;
	/** The account label as the server composed it, percent-decoded. */
	account: string;
	/** Base32 seed, normalised. Never logged, never persisted. */
	secret: string;
	algorithm: 'SHA1' | 'SHA256' | 'SHA512';
	digits: number;
	/** Seconds per code. */
	period: number;
}

const BASE32 = /^[A-Z2-7]+=*$/;

/** Groups of four, so a human can compare it against what their app shows. */
export function formatSecret(secret: string): string {
	return (secret.toUpperCase().match(/.{1,4}/g) ?? []).join(' ');
}

export function isBase32(secret: string): boolean {
	return BASE32.test(secret.toUpperCase());
}

export type ParseResult = { ok: true; value: OtpAuth } | { ok: false; reason: string };

/**
 * Parses an otpauth URI, or explains why it could not.
 *
 * Only the `totp` type is accepted. A hotp URI is a different protocol and the
 * operator surface has no counter to check it against, so accepting one and
 * showing it as if it were TOTP would be a lie.
 */
export function parseOtpAuthUri(uri: string): ParseResult {
	let url: URL;
	try {
		url = new URL(uri);
	} catch {
		return { ok: false, reason: 'That is not a valid otpauth:// link.' };
	}

	if (url.protocol !== 'otpauth:') {
		return { ok: false, reason: 'That link is not an otpauth:// link.' };
	}
	// "otpauth:" + "//" leaves "totp/Ledge:user" as the pathname.
	const head = url.pathname.replace(/^\/+/, '').split('/')[0]?.toLowerCase() ?? '';
	const type = url.hostname || head;
	if (type !== 'totp') {
		return { ok: false, reason: `Only time-based codes (totp) are supported, not "${type || 'unknown'}".` };
	}

	const label = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
	const secret = (url.searchParams.get('secret') ?? '').trim().toUpperCase();
	if (!secret) return { ok: false, reason: 'The link carries no secret.' };
	if (!isBase32(secret)) return { ok: false, reason: 'The secret is not valid base32.' };

	const digitsRaw = Number(url.searchParams.get('digits') ?? 6);
	const digits = Number.isFinite(digitsRaw) && digitsRaw >= 6 && digitsRaw <= 10 ? digitsRaw : 6;

	const periodRaw = Number(url.searchParams.get('period') ?? 30);
	const period = Number.isFinite(periodRaw) && periodRaw >= 15 && periodRaw <= 120 ? periodRaw : 30;

	const algorithmRaw = (url.searchParams.get('algorithm') ?? 'SHA1').toUpperCase();

	// The issuer may be a query parameter, a "Issuer:account" label prefix, or
	// both; the query parameter wins, which is what authenticator apps do.
	const labelIssuer = label.includes(':') ? label.slice(0, label.indexOf(':')).trim() : '';
	const issuer = (url.searchParams.get('issuer') ?? labelIssuer).trim();

	return {
		ok: true,
		value: {
			issuer,
			account: (label.includes(':') ? label.slice(label.indexOf(':') + 1) : label).trim(),
			secret,
			algorithm: algorithmRaw === 'SHA256' || algorithmRaw === 'SHA512' ? algorithmRaw : 'SHA1',
			digits,
			period,
		},
	};
}

/** "Every 30 seconds" / "Every 60 seconds", for the enrolment summary line. */
export const periodLabel = (seconds: number) => (seconds % 60 === 0 ? `every ${seconds / 60} minute${seconds === 60 ? '' : 's'}` : `every ${seconds} seconds`);
