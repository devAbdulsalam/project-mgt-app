/** Build a CSV file from rows and trigger a browser download. */
export function downloadCsv(filename: string, rows: (string | number | undefined | null)[][]) {
	const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
	const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
	const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}
