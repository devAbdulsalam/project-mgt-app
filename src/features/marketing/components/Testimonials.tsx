import { Avatar } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { Reveal } from './Reveal';
import { SectionHeader } from './Section';
import { Bubble, container } from './bits';

const stories = [
	{
		name: 'Adaeze O.',
		role: 'Operations lead at an IT services firm in Lagos, juggling 40 client sites and a WhatsApp inbox that never stopped.',
		src: 'https://randomuser.me/api/portraits/women/44.jpg',
		tint: 'teal',
		dark: true,
		thread: [
			{
				side: 'left',
				text: 'Ledge Desk has been a lifesaver. Every WhatsApp message becomes a ticket with an SLA timer, so nothing slips.',
			},
			{ side: 'right', text: 'Thanks, Adaeze!' },
			{ side: 'right', text: 'Glad the queue is under control.' },
		],
	},
	{
		name: 'David K.',
		role: 'Field engineer covering Abuja, who wanted his day planned before he left the house.',
		src: 'https://randomuser.me/api/portraits/men/44.jpg',
		tint: 'tan',
		thread: [
			{
				side: 'left',
				text: 'I open the app, see my visits in order, and the client already knows my ETA. Checklists and photos go straight into the ticket.',
			},
			{ side: 'left', text: 'I love it!' },
			{ side: 'right', text: 'We appreciate the feedback!' },
		],
	},
	{
		name: 'Maya R.',
		role: 'Product manager running a small software team alongside customer support.',
		src: 'https://randomuser.me/api/portraits/men/41.jpg',
		tint: 'lavender',
		thread: [
			{
				side: 'left',
				text: 'Support tickets and sprint work finally live on one board. Bugs from clients land straight in our backlog.',
			},
			{ side: 'right', text: 'Thanks, Maya! So glad it clicked.' },
			{ side: 'right', text: 'Share any ideas anytime.' },
		],
	},
] as const;

export function Testimonials() {
	return (
		<section id="solutions" className="scroll-mt-20 py-20 sm:py-28">
			<div className={container}>
				<SectionHeader
					title={
						<>
							Resolve faster &amp;
							<br className="hidden sm:block" /> grow every account
						</>
					}
				>
					Centralise every request from email, WhatsApp, phone and the client
					portal. Ledge Desk categorises it, starts the SLA clock and surfaces
					the drivers of unhappy clients before renewals are at risk.
				</SectionHeader>

				<ul className="rail mt-12 -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
					{stories.map((s, i) => (
						<Reveal
							as="li"
							key={s.name}
							delay={i * 110}
							className={cn(
								'flex w-[82vw] shrink-0 snap-center flex-col rounded-[22px] p-5 sm:w-auto sm:p-6',
								'dark' in s && s.dark
									? 'bg-brand-900 text-white'
									: 'bg-muted text-t1',
							)}
						>
							<div className="flex items-start gap-3">
								<Avatar
									name={s.name}
									tint={s.tint}
									src={s.src}
									size="lg"
									className={cn(
										'dark' in s && s.dark && 'ring-2 ring-white/20',
									)}
								/>
							</div>
							<div className="mt-3 text-[16px] font-semibold">{s.name}</div>
							<p
								className={cn(
									'mt-1 text-[12.5px] leading-relaxed',
									'dark' in s && s.dark ? 'text-on-dark-muted' : 'text-t2',
								)}
							>
								{s.role}
							</p>

							<div className="mt-5 flex flex-1 flex-col gap-2">
								{s.thread.map((m, j) => (
									<Bubble key={j} side={m.side} dark={'dark' in s && s.dark}>
										{m.text}
									</Bubble>
								))}
							</div>
						</Reveal>
					))}
				</ul>
			</div>
		</section>
	);
}
