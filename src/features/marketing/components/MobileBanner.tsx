import { Bell, Home, MapPin, Play, Plus, Smartphone, Ticket, User, Wrench } from 'lucide-react';
import { Pill } from '@/shared/ui';
import { Reveal } from './Reveal';
import { useParallax } from '../hooks/useParallax';

export function MobileBanner() {
	const phone = useParallax<HTMLDivElement>(-0.07);
	return (
		<section className="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 lg:py-28">
			<Reveal variant="scale" className="relative rounded-[28px] bg-brand-900 text-white">
				<div className="grid items-center gap-10 px-6 py-10 sm:px-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-16 lg:px-16 lg:py-14">
					<div className="mx-auto lg:-my-24">
						<div ref={phone} className="plx">
							<PhoneMock />
						</div>
					</div>
					<div className="max-w-[480px]">
						<h3 className="text-[26px] leading-tight font-semibold sm:text-[30px]">Stay connected in the field</h3>
						<p className="mt-4 text-[14px] leading-relaxed text-on-dark-muted">
							Engineers get their day at a glance: the next visit, the route, the asset history and the client&apos;s WhatsApp thread. Checkpoints, photos and signatures sync back to the ticket the moment there is signal.
						</p>
						<p className="mt-3 text-[14px] leading-relaxed text-on-dark-muted">Installs from the browser on Android and iPhone. No app store account needed for your team.</p>
						<div className="mt-6 flex flex-wrap gap-3">
							<a href="#product" className="btn-pill btn-pill-ghost h-11 px-4 text-[13px]">
								<Play size={15} aria-hidden /> Get it on Google Play
							</a>
							<a href="#product" className="btn-pill btn-pill-ghost h-11 px-4 text-[13px]">
								<Smartphone size={15} aria-hidden /> Download on the App Store
							</a>
						</div>
					</div>
				</div>
			</Reveal>
		</section>
	);
}

function PhoneMock() {
	return (
		<div className="w-[250px] rounded-[40px] border-[7px] border-[#0f1b21] bg-[#0f1b21] shadow-pop" aria-hidden>
			<div className="relative h-[520px] overflow-hidden rounded-[33px] bg-canvas text-t1">
				<div className="absolute top-2 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-[#0f1b21]" />
				<div className="bg-brand-900 px-4 pt-10 pb-4 text-white">
					<div className="flex items-start justify-between">
						<div>
							<div className="text-[15px] font-semibold">Chinedu</div>
							<div className="text-[11px] text-on-dark-muted">Kolanut Systems Ltd</div>
						</div>
						<span className="relative grid size-8 place-items-center rounded-full bg-white/10">
							<Bell size={14} />
							<span className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-brand-900 bg-danger" />
						</span>
					</div>
					<div className="mt-3 grid grid-cols-3 gap-2">
						{[
							{ v: '6', l: 'Open' },
							{ v: '3', l: 'Visits today' },
							{ v: '2', l: 'On site' },
						].map((k) => (
							<div key={k.l} className="rounded-[10px] bg-white/[.08] p-2">
								<b className="tabular block text-[16px] leading-none font-semibold">{k.v}</b>
								<span className="mt-1 block text-[10px] text-on-dark-muted">{k.l}</span>
							</div>
						))}
					</div>
				</div>
				<div className="p-4">
					<div className="text-[12px] font-semibold">Quick actions</div>
					<div className="mt-2 grid grid-cols-3 gap-2">
						{[
							{ icon: Plus, l: 'New ticket', c: 'bg-lavender-bg text-lavender-fg' },
							{ icon: Wrench, l: 'Log visit', c: 'bg-tan-bg text-tan-fg' },
							{ icon: MapPin, l: 'My route', c: 'bg-green-bg text-green-fg' },
						].map(({ icon: Icon, l, c }) => (
							<div key={l} className="rounded-[12px] bg-white p-2 text-center shadow-card">
								<span className={`mx-auto grid size-8 place-items-center rounded-[8px] ${c}`}>
									<Icon size={14} />
								</span>
								<span className="mt-1.5 block text-[9px] leading-tight font-medium">{l}</span>
							</div>
						))}
					</div>
					<div className="mt-4 flex items-center justify-between text-[12px]">
						<b className="font-semibold">Next visit</b>
						<span className="text-brand-600">See all</span>
					</div>
					<div className="mt-2 rounded-[12px] bg-white p-3 shadow-card">
						<div className="flex items-start justify-between gap-2">
							<b className="text-[12px] leading-snug font-semibold">UPS beeping at Lekki branch</b>
							<Pill tone="progress">09:30</Pill>
						</div>
						<div className="mt-1 text-[11px] text-brand-600">Lekki Fintech · Admiralty Way</div>
						<div className="mt-2 flex items-center justify-between text-[10px] text-t3">
							<span>KS-2041</span>
							<span>ETA 25 min</span>
						</div>
					</div>
				</div>
				<div className="absolute inset-x-0 bottom-0 flex justify-around border-t border-border bg-white px-2 pt-2 pb-4 text-[9px] text-t3">
					{[
						{ icon: Home, l: 'Home', on: true },
						{ icon: Ticket, l: 'Tickets' },
						{ icon: MapPin, l: 'Visits' },
						{ icon: User, l: 'Profile' },
					].map(({ icon: Icon, l, on }) => (
						<span key={l} className={`flex flex-col items-center gap-1 ${on ? 'text-brand-900' : ''}`}>
							<Icon size={16} />
							{l}
						</span>
					))}
				</div>
			</div>
		</div>
	);
}
