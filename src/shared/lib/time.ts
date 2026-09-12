import { useEffect, useState } from 'react';

/** Re-renders on an interval so countdowns and "x min ago" stay fresh. */
export function useNow(intervalMs = 30_000) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), intervalMs);
		return () => clearInterval(id);
	}, [intervalMs]);
	return now;
}

export function relativeTime(ts: number, now = Date.now()) {
	const diff = Math.round((now - ts) / 1000);
	const abs = Math.abs(diff);
	const past = diff >= 0;
	const fmt = (n: number, unit: string) => (past ? `${n} ${unit}${n === 1 ? '' : 's'} ago` : `in ${n} ${unit}${n === 1 ? '' : 's'}`);
	if (abs < 45) return past ? 'just now' : 'in a moment';
	if (abs < 3600) return fmt(Math.max(1, Math.round(abs / 60)), 'min');
	if (abs < 86400) return fmt(Math.round(abs / 3600), 'hour');
	if (abs < 86400 * 2) return past ? 'Yesterday' : 'Tomorrow';
	if (abs < 86400 * 7) return fmt(Math.round(abs / 86400), 'day');
	return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(ts);
}

/** "1h 05m", "3d", "0h 38m" — remaining time until `dueAt`. Negative when overdue. */
export function countdown(dueAt: number, now = Date.now()): { label: string; overdue: boolean; minutes: number } {
	const minutes = Math.round((dueAt - now) / 60_000);
	const abs = Math.abs(minutes);
	let label: string;
	if (abs >= 2 * 24 * 60) label = `${Math.floor(abs / (24 * 60))}d`;
	else if (abs >= 24 * 60) label = `${Math.floor(abs / (24 * 60))}d ${Math.floor((abs % (24 * 60)) / 60)}h`;
	else label = `${Math.floor(abs / 60)}h ${(abs % 60).toString().padStart(2, '0')}m`;
	return { label: minutes < 0 ? `-${label}` : label, overdue: minutes < 0, minutes };
}

export function dueLabel(dueAt: number, now = Date.now()) {
	const d = new Date(dueAt);
	const startOfToday = new Date(now);
	startOfToday.setHours(0, 0, 0, 0);
	const dayDiff = Math.floor((d.getTime() - startOfToday.getTime()) / 86_400_000);
	if (dayDiff < 0) return { label: `Overdue ${Math.abs(dayDiff)}d`, tone: 'danger' as const };
	if (dayDiff === 0) return { label: 'Today', tone: 'warn' as const };
	if (dayDiff === 1) return { label: 'Tomorrow', tone: 'muted' as const };
	if (dayDiff < 7) return { label: new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric' }).format(d), tone: 'muted' as const };
	return { label: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(d), tone: 'muted' as const };
}

export function formatDateTime(ts: number) {
	return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(ts);
}

export function formatTime(ts: number) {
	return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(ts);
}

export function formatMinutes(min: number) {
	const h = Math.floor(min / 60);
	const m = min % 60;
	if (h === 0) return `${m}m`;
	if (m === 0) return `${h}h`;
	return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export function toDateInputValue(ts?: number) {
	if (!ts) return '';
	const d = new Date(ts);
	return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

export function fromDateInputValue(v: string) {
	if (!v) return undefined;
	const [y, m, d] = v.split('-').map(Number);
	return new Date(y!, m! - 1, d!, 17, 0).getTime();
}
