const DAY = 86_400_000;

export const addDays = (ts: number, n: number) => { const d = new Date(ts); d.setDate(d.getDate() + n); return d.getTime(); };
export const startOfDay = (ts: number) => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
export const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

/** Monday (or Sunday) 00:00 of the week containing `ts`. */
export function startOfWeek(ts: number, startDay: 'monday' | 'sunday' = 'monday') {
	const d = new Date(startOfDay(ts));
	const offset = startDay === 'monday' ? (d.getDay() + 6) % 7 : d.getDay();
	d.setDate(d.getDate() - offset);
	return d.getTime();
}

export const toIsoDate = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export function fromIsoDate(v?: string) {
	if (!v) return undefined;
	const [y, m, d] = v.split('-').map(Number);
	if (!y || !m || !d) return undefined;
	return new Date(y, m - 1, d).getTime();
}

/** 6 rows × 7 days covering the month of `anchor`. */
export function monthGrid(anchor: number, startDay: 'monday' | 'sunday' = 'monday') {
	const d = new Date(anchor);
	const first = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
	const start = startOfWeek(first, startDay);
	return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, i) => start + (w * 7 + i) * DAY));
}

export const weekDays = (start: number) => Array.from({ length: 7 }, (_, i) => addDays(start, i));

export const fmtDay = (ts: number, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric' }) => new Date(ts).toLocaleDateString('en-GB', opts);
export const fmtMonth = (ts: number) => new Date(ts).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
export const fmtRange = (a: number, b: number) => `${new Date(a).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(b).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
