// QR encoding, in the browser, from a library with no network calls.
//
// Why this file exists rather than an <img> pointing at an image service:
//
//   The payload is an `otpauth://` URI, and that URI *is* the TOTP seed. Any
//   third party that saw it could mint valid codes for this operator's account
//   for as long as the seed is enrolled. A hosted "QR code generator" would
//   therefore be handing a working second factor to whoever runs the service,
//   and would keep the URL in their logs. So: encoded locally, from a pinned
//   dependency, and the secret never leaves the tab.
//
// Error correction is M (~15%). A QR that fails to scan because of a smudged
// screen is a support ticket at the worst possible moment — during enrolment,
// with no second factor yet — so the redundancy is worth the extra modules.
// H (~30%) would be more than a URI this size needs.

import qrcode from 'qrcode-generator';

export type QrErrorLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrMatrix {
	/** Modules per side, excluding the quiet zone. */
	size: number;
	/** Dark = true. Row-major, `size * size` entries. */
	modules: boolean[];
}

/**
 * Encodes `text` into a module matrix.
 *
 * Throws rather than returning null: a QR that silently fails to render is a
 * QR an operator cannot enrol from, and the caller has to be able to say so.
 */
export function encodeQr(text: string, level: QrErrorLevel = 'M'): QrMatrix {
	if (!text) throw new Error('Cannot encode an empty QR payload.');

	// Type number 0 lets the library pick the smallest version that fits, which
	// is what keeps an otpauth URI at a scannable module size on a phone camera.
	const qr = qrcode(0, level);
	qr.addData(text, 'Byte');
	qr.make();

	const size = qr.getModuleCount();
	const modules = new Array<boolean>(size * size);
	for (let row = 0; row < size; row++) {
		for (let col = 0; col < size; col++) {
			modules[row * size + col] = qr.isDark(row, col);
		}
	}
	return { size, modules };
}

/**
 * Collapses each module into a single SVG path of horizontal runs.
 *
 * A <rect> per module is ~2,900 elements for a version-6 code, which is slow to
 * diff and slow to render. Runs cut that to a few hundred subpaths and let the
 * browser treat the whole code as one shape.
 */
export function qrToPath(matrix: QrMatrix): string {
	const { size, modules } = matrix;
	const parts: string[] = [];
	for (let row = 0; row < size; row++) {
		let runStart = -1;
		for (let col = 0; col <= size; col++) {
			const dark = col < size && modules[row * size + col];
			if (dark && runStart === -1) runStart = col;
			else if (!dark && runStart !== -1) {
				parts.push(`M${runStart} ${row}h${col - runStart}v1h-${col - runStart}z`);
				runStart = -1;
			}
		}
	}
	return parts.join('');
}

/** viewBox size including the quiet zone, which the spec requires to be 4 modules. */
export const QUIET_ZONE = 4;

export const qrViewBox = (matrix: QrMatrix) => -(QUIET_ZONE) + ' ' + -(QUIET_ZONE) + ' ' + (matrix.size + QUIET_ZONE * 2) + ' ' + (matrix.size + QUIET_ZONE * 2);
