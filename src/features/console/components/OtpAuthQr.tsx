// The otpauth QR an operator scans to enrol their authenticator.
//
// Renders locally, from lib/qr.ts. Nothing about this component reaches the
// network, which is the whole point: the payload is the TOTP seed, and a hosted
// QR generator would be a third party holding a working second factor for every
// operator who ever opened this screen.
//
// What is deliberately absent: any "regenerate" that silently swaps the secret.
// The seed is staged server-side and confirming is what makes it live, so a
// reload that re-renders this QR shows the same code the authenticator already
// scanned. If the seed is genuinely lost, the operator starts enrolment again
// from the security page — an explicit action with a confirmation, not
// something a double-click can do.

import { useMemo } from 'react';
import { encodeQr, qrToPath, qrViewBox } from '../lib/qr';
import { parseOtpAuthUri, periodLabel, type OtpAuth } from '../lib/otpauth';

export function OtpAuthQr({ uri, size = 248 }: { uri: string; size?: number }) {
	// Encoding throws on an empty or unencodable payload. Parsing first means
	// the screen can show *why* rather than a blank square, which on an
	// enrolment screen is the difference between a fixable error and a dead end.
	const parsed = useMemo(() => parseOtpAuthUri(uri), [uri]);
	const matrix = useMemo(() => (parsed.ok ? encodeQr(uri, 'M') : null), [uri, parsed]);

	if (!parsed.ok || !matrix) {
		return (
			<div className="grid place-items-center rounded-[10px] border border-dashed border-border-strong bg-muted p-6 text-center text-xs text-t2" style={{ width: size, height: size }}>
				<div className="max-w-[80%]">
					<p className="font-semibold text-t1">This code cannot be shown.</p>
					<p className="mt-1">{parsed.ok ? 'The enrolment link could not be encoded.' : parsed.reason}</p>
					<p className="mt-2 text-t3">Start enrolment again, or enter the setup key by hand.</p>
				</div>
			</div>
		);
	}

	const label = describe(parsed.value);

	return (
		<figure className="m-0 inline-flex flex-col items-center gap-2">
			{/*
			 * role="img" with a label rather than an <img>: the SVG is drawn from
				*values* a camera reads, not an image a person reads, so it needs a
			 * text alternative for anyone not using it as a barcode.
			 */}
			<svg
				role="img"
				aria-label={`QR code to add ${label.account} to an authenticator app`}
				viewBox={qrViewBox(matrix)}
				width={size}
				height={size}
				className="rounded-[10px] bg-white p-1"
				shapeRendering="crispEdges"
			>
				<title>Authenticator enrolment code</title>
				<desc>{label.summary}</desc>
				{/* A white plate under the path, so the quiet zone is enforced by the
				    background rather than by drawing it as modules. */}
				<rect x={-4} y={-4} width={matrix.size + 8} height={matrix.size + 8} fill="#fff" />
				<path d={qrToPath(matrix)} fill="#1b2a32" />
			</svg>
			<figcaption className="text-center text-[11px] leading-snug text-t2">
				{label.issuer ? <span className="font-semibold text-t1">{label.issuer}</span> : null}
				{label.issuer ? ' · ' : null}
				{label.account}
				<br />
				{label.digits} digits, {periodLabel(label.period)}
			</figcaption>
		</figure>
	);
}

/** "Ledge — adaeze@…, 6 digits, every 30 seconds" for the accessible name. */
function describe(otp: OtpAuth) {
	const account = otp.account || 'this account';
	return {
		account,
		issuer: otp.issuer,
		digits: otp.digits,
		period: otp.period,
		summary: `${otp.issuer ? `${otp.issuer} ` : ''}${account}. ${otp.digits} digits, ${periodLabel(otp.period)}, ${otp.algorithm}.`,
	};
}
