import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { Card, CardHeader } from '@/shared/ui';
import { channelMeta, type Channel } from '@/mocks/data';
import { rangeLabels, type Range, type SeriesPoint } from '../model';

const order: Channel[] = ['whatsapp', 'email', 'phone', 'portal'];

function ChartTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
	if (!active || !payload?.length) return null;
	const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
	return (
		<div className="rounded-sm bg-t1 px-2.5 py-1.5 text-[11px] text-white shadow-pop">
			<b>
				{label} · {total}
			</b>
			<div className="mt-1 space-y-0.5">
				{[...payload].reverse().map((p) => (
					<div key={p.dataKey as string} className="flex items-center gap-1.5">
						<span className="size-1.5 rounded-full" style={{ background: p.color }} />
						{channelMeta[p.dataKey as Channel].label}
						<span className="ms-auto ps-3 tabular">{p.value}</span>
					</div>
				))}
			</div>
		</div>
	);
}

export function ChannelChart({ series, share, range, note }: { series: SeriesPoint[]; share: { channel: Channel; pct: number }[]; range: Range; note: string }) {
	const max = Math.max(...series.map((p) => p.whatsapp + p.email + p.phone + p.portal), 10);
	const top = Math.ceil(max / 20) * 20;
	const dense = series.length > 12;
	return (
		<Card className="flex min-w-0 flex-col p-5">
			<CardHeader
				title={`Tickets by channel · ${rangeLabels[range].toLowerCase()}`}
				sub="Where requests came from"
				action={
					<ul className="hidden flex-wrap items-center gap-3 text-xs sm:flex" aria-label="Legend">
						{order.map((c) => (
							<li key={c} className="flex items-center gap-1.5" style={{ color: channelMeta[c].color }}>
								<span className="size-[7px] rounded-full bg-current" aria-hidden />
								<span className="text-t1">{channelMeta[c].label}</span>
							</li>
						))}
					</ul>
				}
			/>
			<div className="mt-3 h-[200px] w-full min-w-0" role="img" aria-label={`Stacked bar chart of tickets per period by channel, ${rangeLabels[range].toLowerCase()}`}>
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={series} margin={{ top: 8, right: 4, left: -20, bottom: 0 }} barCategoryGap={dense ? '20%' : '30%'}>
						<CartesianGrid vertical={false} stroke="#e5e8ec" />
						<XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#5f6e78' }} interval={dense ? Math.ceil(series.length / 8) - 1 : 0} />
						<YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8a97a0' }} domain={[0, top]} tickCount={4} />
						<Tooltip content={ChartTooltip} cursor={{ fill: 'rgba(16,24,40,.04)' }} />
						{order.map((c, i) => (
							<Bar key={c} dataKey={c} stackId="a" fill={channelMeta[c].color} radius={i === order.length - 1 ? [3, 3, 0, 0] : 0} isAnimationActive={false} />
						))}
					</BarChart>
				</ResponsiveContainer>
			</div>
			<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-t2">
				{share.map((s) => (
					<span key={s.channel}>
						<b className="text-t1">{s.pct}%</b> {channelMeta[s.channel].label}
					</span>
				))}
				<span className="ms-auto hidden xl:inline">{note}</span>
			</div>
		</Card>
	);
}
