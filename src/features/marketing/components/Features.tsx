import { Check, MessageSquare, QrCode } from 'lucide-react';
import { Pill } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { Reveal } from './Reveal';
import { SectionHeader } from './Section';

const queue = [
	{ title: 'UPS beeping at Lekki branch', meta: 'P1 · SLA 1h 12m left', done: false },
	{ title: 'Printer offline, ward 3', meta: 'Dispatched · Amina', done: false },
	{ title: 'Email not syncing on 4 laptops', meta: 'Remote session booked', done: true },
	{ title: 'Portal login loop on Safari', meta: 'Resolved · CSAT 5/5', done: true },
];

const takeaway = ['3 P1 tickets resolved within SLA', 'Chinedu: 4 visits, 2 parts approvals', 'Portal CSAT this week: 4.8 / 5', 'Kano Textiles renewal due Friday'];

// Deterministic 9x9 pattern for the decorative QR tile.
const qrPattern = '111111101110111110000010100101000010111010011101110101110100101011101011101000001001001011111110101100000000111010100101001011001010011110111001111111011010000010101111101110010101110100011101110101101110100000101111';

export function Features() {
	return (
		<section id="resources" className="mx-auto max-w-[1200px] scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
			<SectionHeader title={<>Empower your team<br className="hidden sm:block" /> with Ledge Desk</>}>
				Discover the tools designed to keep tickets moving and engineers connected, whether the job is at a desk in Ikeja or a substation in Kano.
			</SectionHeader>

			{/* Big card */}
			<Reveal variant="scale" className="mt-10 overflow-hidden rounded-[24px] bg-brand-900 text-white">
				<div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-10">
					<div>
						<h3 className="text-[24px] leading-tight font-semibold sm:text-[28px]">Manage your queue</h3>
						<p className="mt-3 max-w-[440px] text-[14px] leading-relaxed text-on-dark-muted">
							Triage by SLA, assign by area, and let automation nudge the rest. Every ticket carries its client, site, asset and history so nobody asks twice.
						</p>
						<ul className="mt-6 max-w-[480px] divide-y divide-white/10 rounded-[14px] border border-white/10 bg-white/[.06]">
							{queue.map((q) => (
								<li key={q.title} className="flex items-center gap-3 px-4 py-3">
									<span className={cn('grid size-5 shrink-0 place-items-center rounded-full border', q.done ? 'border-success bg-success text-white' : 'border-white/30')}>
										{q.done ? <Check size={12} strokeWidth={3} /> : null}
									</span>
									<span className="min-w-0 flex-1">
										<span className={cn('block truncate text-[13px]', q.done && 'text-on-dark-muted line-through')}>{q.title}</span>
										<span className="block text-[11px] text-on-dark-muted">{q.meta}</span>
									</span>
								</li>
							))}
						</ul>
					</div>

					<Reveal variant="right" delay={150} className="self-end rounded-[18px] border border-white/15 bg-white/[.08] p-5 backdrop-blur-sm">
						<h4 className="text-[16px] font-semibold">Shift takeaway</h4>
						<ul className="mt-3 flex flex-col gap-2.5">
							{takeaway.map((t) => (
								<li key={t} className="flex items-start gap-2.5 text-[13px] text-white/90">
									<span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-white/40">
										<span className="size-1.5 rounded-full bg-white" />
									</span>
									{t}
								</li>
							))}
						</ul>
					</Reveal>
				</div>
			</Reveal>

			{/* Three feature tiles */}
			<div className="mt-4 grid gap-4 md:grid-cols-3">
				<Reveal delay={0} className="flex flex-col rounded-[20px] border border-border bg-white p-5 shadow-card sm:p-6">
					<h3 className="text-[17px] font-semibold text-t1">WhatsApp in the ticket</h3>
					<p className="mt-1.5 text-[13px] leading-relaxed text-t2">Client messages, voice notes and photos become tickets with the thread attached.</p>
					<div className="mt-5 rounded-[14px] bg-muted p-3.5" aria-hidden>
						<div className="mb-1.5 flex items-center gap-1.5 text-[10px] text-success-fg">
							<MessageSquare size={11} /> WhatsApp · +234 803 ··· 0142
						</div>
						<p className="rounded-[12px] rounded-tl-[4px] bg-white px-3 py-2 text-[12px] leading-snug text-t1 shadow-card">
							Hi, our UPS at the Lekki branch is beeping again since this morning
						</p>
						<div className="mt-2 flex justify-end">
							<Pill tone="teal">Ticket KS-2041 created</Pill>
						</div>
					</div>
				</Reveal>

				<Reveal delay={110} className="flex flex-col rounded-[20px] border border-border bg-white p-5 shadow-card sm:p-6">
					<h3 className="text-[17px] font-semibold text-t1">Boards &amp; sprints</h3>
					<p className="mt-1.5 text-[13px] leading-relaxed text-t2">Plan project work next to support tickets, with WIP limits and burndown built in.</p>
					<div className="mt-5 grid flex-1 grid-cols-3 gap-2" aria-hidden>
						{[
							{ name: 'To do', bars: ['w-full', 'w-3/4'] },
							{ name: 'Doing', bars: ['w-full', 'w-2/3', 'w-5/6'] },
							{ name: 'Done', bars: ['w-4/5'] },
						].map((c) => (
							<div key={c.name} className="rounded-[10px] bg-muted p-2">
								<div className="mb-2 text-[10px] font-medium text-t2">{c.name}</div>
								<div className="flex flex-col gap-1.5">
									{c.bars.map((w, i) => (
										<div key={i} className={cn('h-6 rounded-md bg-white shadow-card', w)}>
											<div className={cn('m-1.5 h-1 w-1/2 rounded-full', c.name === 'Done' ? 'bg-success' : c.name === 'Doing' ? 'bg-brand-600' : 'bg-border-strong')} />
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				</Reveal>

				<Reveal delay={220} className="flex flex-col rounded-[20px] border border-border bg-white p-5 shadow-card sm:p-6">
					<h3 className="text-[17px] font-semibold text-t1">Assets with QR labels</h3>
					<p className="mt-1.5 text-[13px] leading-relaxed text-t2">Scan a label on site to open history, warranty and every ticket for that device.</p>
					<div className="mt-5 flex items-center gap-4 rounded-[14px] bg-muted p-3.5" aria-hidden>
						<div className="qr w-[72px] shrink-0 rounded-md bg-white p-1.5">
							{qrPattern.slice(0, 81).split('').map((bit, i) => <i key={i} className={bit === '0' ? 'o' : undefined} />)}
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-1.5 text-[12px] font-semibold text-t1">
								<QrCode size={13} className="text-brand-600" /> UPS-LK-07
							</div>
							<div className="mt-1 text-[11px] text-t2">APC Smart-UPS 3000 · Lekki branch</div>
							<div className="mt-2 flex flex-wrap gap-1.5">
								<Pill tone="done">Warranty to Mar 2027</Pill>
								<Pill tone="open">3 open</Pill>
							</div>
						</div>
					</div>
				</Reveal>
			</div>
		</section>
	);
}
