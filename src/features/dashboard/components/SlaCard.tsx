import { Card, CardHeader, ProgressBar } from '@/shared/ui';
import type { SlaSummary as Summary } from '../model';

function Donut({ summary }: { summary: Summary }) {
	const r = 15.9;
	const segments = summary.breakdown.reduce<Array<{ key: string; pct: number; color: string; offset: number }>>((acc, b) => {
		const prev = acc[acc.length - 1];
		acc.push({ ...b, offset: prev ? prev.offset - prev.pct : 25 });
		return acc;
	}, []);
	return (
		<svg width="130" height="130" viewBox="0 0 42 42" role="img" aria-label={summary.metPct === null ? 'No SLA data' : `SLA met ${summary.metPct}%`} className="shrink-0">
			<circle cx="21" cy="21" r={r} fill="none" stroke="#e8eaed" strokeWidth="6" />
			{segments.map((b) => (
				<circle key={b.key} cx="21" cy="21" r={r} fill="none" stroke={b.color} strokeWidth="6" strokeDasharray={`${b.pct} ${100 - b.pct}`} strokeDashoffset={b.offset} />
			))}
			<text x="21" y="20" textAnchor="middle" fontSize="7" fontWeight="600" fill="#1b2a32">
				{summary.metPct === null ? '—' : `${summary.metPct}%`}
			</text>
			<text x="21" y="26" textAnchor="middle" fontSize="3.2" fill="#5f6e78">
				met
			</text>
		</svg>
	);
}

export function SlaCard({ summary, periodLabel }: { summary: Summary; periodLabel: string }) {
	return (
		<Card className="p-5">
			<CardHeader title="SLA performance" sub={`${periodLabel} · by priority`} />
			<div className="mt-3.5 flex items-center gap-5">
				<Donut summary={summary} />
				<ul className="flex flex-1 flex-col gap-2 text-[13px]">
					{summary.breakdown.map((b) => (
						<li key={b.key} className="flex items-center gap-2">
							<span className="size-[7px] rounded-full" style={{ background: b.color }} aria-hidden />
							{b.label}
							<b className="tabular ms-auto">{b.pct}%</b>
						</li>
					))}
				</ul>
			</div>
			<dl className="mt-3.5 space-y-2 text-xs">
				{summary.byPriority.map((p) => {
					const warn = p.pct !== null && p.pct < 90;
					return (
						<div key={p.label}>
							<div className="flex justify-between">
								<dt>{p.label}</dt>
								<dd className={`tabular font-semibold ${warn ? 'text-high-fg' : ''}`}>{p.pct === null ? '—' : `${p.pct}%`}</dd>
							</div>
							<ProgressBar value={p.pct ?? 0} color={warn ? '#e0a100' : '#22a05b'} className="mt-1" label={p.label} />
						</div>
					);
				})}
			</dl>
		</Card>
	);
}
