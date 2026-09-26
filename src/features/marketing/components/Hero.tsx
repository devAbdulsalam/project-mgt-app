import { useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Bell, Check, Clock, LayoutDashboard, MapPin, MessageSquare, Search, Settings, Ticket, UserPlus, Users, Zap } from 'lucide-react';
import { Avatar, Pill, channelMeta, tintRings, type PillTone } from '@/shared/ui';
import { useAuthStore } from '@/shared/lib/auth-store';
import { cn } from '@/shared/lib/cn';
import { Reveal } from './Reveal';
import { useParallax } from '../hooks/useParallax';
import { photoOf } from '../people';

export function Hero() {
	return (
		<section id="product" className="relative scroll-mt-20 overflow-hidden px-5 pt-10 pb-14 sm:px-8 sm:pt-16 sm:pb-20">
			<div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px] bg-[radial-gradient(55%_50%_at_50%_0%,rgba(46,111,134,0.12),transparent_70%)]" />

			<div className="mx-auto max-w-[1200px] text-center">
				<Reveal as="h1" className="mx-auto max-w-[920px] text-[34px] leading-[1.08] font-semibold tracking-[-0.025em] text-t1 sm:text-[48px] lg:text-[60px]">
					<span className="text-brand-600">Ledge Desk</span> <AvatarStack /> One desk for
					<br className="hidden sm:block" /> support, field work &amp; projects
				</Reveal>
				<Reveal as="p" delay={100} className="mx-auto mt-5 max-w-[580px] text-[15px] leading-relaxed text-t2 sm:text-[16px]">
					Run your helpdesk, field visits, assets and sprints from one place. WhatsApp, email, phone and portal requests land in a single queue with SLA timers your clients can trust.
				</Reveal>
				<Reveal delay={200}>
					<EmailForm />
				</Reveal>
				<Reveal as="p" delay={280} className="mt-4 text-[12px] text-t3">
					Free 14-day trial · No card needed · NDPR compliant
				</Reveal>
			</div>

			<HeroVisual />
		</section>
	);
}

function AvatarStack() {
	const people: { name: string; tint: 'dark' | 'teal' | 'tan' | 'green' }[] = [
		{ name: 'Adaeze Okonkwo', tint: 'dark' },
		{ name: 'Chinedu Eze', tint: 'teal' },
		{ name: 'Amina Yusuf', tint: 'tan' },
		{ name: 'Funke Adeyemi', tint: 'green' },
	];
	return (
		<span className="mx-1 inline-flex align-middle" aria-hidden>
			{people.map((p, i) => (
				<Avatar
					key={p.name}
					name={p.name}
					tint={p.tint}
					src={photoOf(p.name)}
					className={cn('size-9 text-[11px] ring-2 sm:size-11 lg:size-13 lg:text-sm', tintRings[p.tint], i > 0 && '-ml-3 sm:-ml-4')}
				/>
			))}
		</span>
	);
}

function EmailForm() {
	const navigate = useNavigate();
	const updateSignup = useAuthStore((s) => s.updateSignup);
	const [email, setEmail] = useState('');
	const org = useAuthStore((s) => (s.status === 'authenticated' ? s.org : null));

	const onSubmit = (e: FormEvent) => {
		e.preventDefault();
		if (org) {
			navigate({ to: '/$org/dashboard', params: { org: org.slug }, search: {} });
			return;
		}
		updateSignup({ email: email.trim() });
		navigate({ to: '/signup' });
	};

	if (org) {
		return (
			<div className="mt-8 flex justify-center">
				<button type="button" onClick={() => navigate({ to: '/$org/dashboard', params: { org: org.slug }, search: {} })} className="btn-pill btn-pill-dark h-11 px-6 text-[14px]">Go to dashboard</button>
			</div>
		);
	}

	return (
		<form
			onSubmit={onSubmit}
			className="mx-auto mt-8 flex w-full max-w-[460px] items-center rounded-full border border-border-strong bg-white p-1.5 shadow-card transition-[border-color,box-shadow] focus-within:border-brand-600 focus-within:shadow-[0_0_0_4px_rgba(46,111,134,0.12)]"
		>
			<label htmlFor="hero-email" className="sr-only">Work email</label>
			<input
				id="hero-email"
				type="email"
				autoComplete="email"
				placeholder="Enter your work email"
				value={email}
				onChange={(e) => setEmail(e.target.value)}
				className="h-10 min-w-0 flex-1 bg-transparent px-4 text-[14px] outline-none placeholder:text-t3"
			/>
			<button type="submit" className="btn-pill btn-pill-dark h-10 px-5 text-[13px]">Get Started</button>
		</form>
	);
}

/* ---------------------------------------------------------------------- */

function HeroVisual() {
	const stage = useParallax<HTMLDivElement>(0.05);
	const visit = useParallax<HTMLDivElement>(-0.09);
	const bubble = useParallax<HTMLDivElement>(-0.13);
	const channels = useParallax<HTMLDivElement>(-0.03);

	return (
		<Reveal variant="scale" delay={320} className="relative mx-auto mt-12 max-w-[1060px] sm:mt-16">
			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_196px]">
				<div ref={stage} className="plx min-w-0">
					<AppWindow />
				</div>
				<div ref={channels} className="plx hidden grid-rows-4 gap-3 lg:grid">
					{(['whatsapp', 'email', 'phone', 'portal'] as const).map((c, i) => (
						<ChannelTile key={c} channel={c} count={[12, 7, 3, 5][i]} />
					))}
				</div>
			</div>

			<div ref={visit} className="plx absolute top-8 -left-4 hidden md:block xl:-left-14">
				<div className="float" style={{ '--fd': '0s' } as CSSProperties}>
					<VisitCard />
				</div>
			</div>
			<div ref={bubble} className="plx absolute right-2 bottom-10 hidden md:block lg:right-[210px]">
				<div className="float" style={{ '--fd': '-3s' } as CSSProperties}>
					<ChatBubble />
				</div>
			</div>
		</Reveal>
	);
}

const rows: { key: string; title: string; client: string; status: string; tone: PillTone; prio: string; prioTone: PillTone; who: string; tint: 'teal' | 'tan' | 'green' | 'lavender' }[] = [
	{ key: 'KS-2041', title: 'UPS beeping at Lekki branch', client: 'Lekki Fintech', status: 'In progress', tone: 'progress', prio: 'P1', prioTone: 'critical', who: 'Chinedu Eze', tint: 'teal' },
	{ key: 'KS-2038', title: 'Printer offline, ward 3', client: 'Abuja Health', status: 'Dispatched', tone: 'teal', prio: 'P2', prioTone: 'high', who: 'Amina Yusuf', tint: 'tan' },
	{ key: 'KS-2036', title: 'Email not syncing on 4 laptops', client: 'Kano Textiles', status: 'Open', tone: 'open', prio: 'P3', prioTone: 'medium', who: 'Emeka Nwosu', tint: 'green' },
	{ key: 'KS-2031', title: 'Router firmware rollout', client: 'PH Logistics', status: 'Waiting', tone: 'pending', prio: 'P3', prioTone: 'medium', who: 'Funke Adeyemi', tint: 'lavender' },
	{ key: 'KS-2027', title: 'Portal login loop on Safari', client: 'Ibadan Press', status: 'Resolved', tone: 'done', prio: 'P4', prioTone: 'low', who: 'Adaeze Okonkwo', tint: 'teal' },
];

function AppWindow() {
	return (
		<div
			className="overflow-hidden rounded-[18px] border border-border bg-white shadow-pop"
			aria-hidden
		>
			<div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
				<span className="size-2.5 rounded-full bg-[#ff5f57]" />
				<span className="size-2.5 rounded-full bg-[#febc2e]" />
				<span className="size-2.5 rounded-full bg-[#28c840]" />
				<span className="ml-3 rounded-md bg-muted px-2 py-0.5 text-[11px] text-t2">
					Kolanut Support · Live queue
				</span>
				<span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-success-fg">
					<span className="size-1.5 animate-pulse rounded-full bg-success" /> 4
					engineers online
				</span>
			</div>

			<div className="grid sm:grid-cols-[148px_minmax(0,1fr)]">
				<aside className="hidden flex-col gap-1 bg-brand-900 p-3 text-[12px] text-on-dark-muted sm:flex">
					{[
						{ icon: LayoutDashboard, label: 'Dashboard' },
						{ icon: Ticket, label: 'Tickets', active: true },
						{ icon: Users, label: 'Clients' },
						{ icon: MapPin, label: 'Visits' },
						{ icon: Zap, label: 'Automation' },
						{ icon: Bell, label: 'Notifications' },
						{ icon: Settings, label: 'Settings' },
					].map(({ icon: Icon, label, active }) => (
						<span
							key={label}
							className={cn(
								'flex items-center gap-2 rounded-md px-2.5 py-1.5',
								active && 'bg-white/10 text-white',
							)}
						>
							<Icon size={14} strokeWidth={1.7} /> {label}
						</span>
					))}
					<span className="mt-auto flex items-center gap-2 border-t border-white/10 pt-3 text-white">
						<Avatar name="Adaeze Okonkwo" tint="dark" src={photoOf('Adaeze Okonkwo')} size="sm" />{' '}
						<span className="truncate">Adaeze O.</span>
					</span>
				</aside>

				<div className="min-w-0 p-3 sm:p-4">
					<div className="mb-3 flex items-center gap-2">
						<span className="flex h-8 flex-1 items-center gap-2 rounded-md border border-border bg-muted px-2.5 text-[12px] text-t3">
							<Search size={13} /> Search tickets, clients, assets…
						</span>
						<span className="btn-pill btn-pill-dark h-8 px-3 text-[11px]">
							+ New ticket
						</span>
					</div>

					<div className="mb-3 grid grid-cols-3 gap-2">
						{[
							{
								label: 'Open tickets',
								value: '288',
								delta: '+12%',
								good: false,
							},
							{
								label: 'SLA compliance',
								value: '94.2%',
								delta: '+1.8%',
								good: true,
							},
							{
								label: 'Resolved today',
								value: '143',
								delta: '+8%',
								good: true,
							},
						].map((k) => (
							<div
								key={k.label}
								className="rounded-[10px] border border-border p-2.5"
							>
								<div className="text-[10px] tracking-wide text-t3 uppercase">
									{k.label}
								</div>
								<div className="mt-0.5 flex items-baseline gap-1.5">
									<b className="tabular text-[18px] leading-none font-semibold text-t1">
										{k.value}
									</b>
									<span
										className={cn(
											'text-[10px]',
											k.good ? 'text-success-fg' : 'text-warning-fg',
										)}
									>
										{k.delta}
									</span>
								</div>
							</div>
						))}
					</div>

					<ul className="divide-y divide-border rounded-[10px] border border-border">
						{rows.map((r) => (
							<li
								key={r.key}
								className="flex items-center gap-3 px-3 py-2 text-[12px]"
							>
								<span className="tabular w-14 shrink-0 text-t3">{r.key}</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-t1">{r.title}</span>
									<span className="block truncate text-[11px] text-brand-600">
										{r.client}
									</span>
								</span>
								<Pill tone={r.tone} className="hidden sm:inline-flex">
									{r.status}
								</Pill>
								<Pill tone={r.prioTone}>{r.prio}</Pill>
								<Avatar name={r.who} tint={r.tint} src={photoOf(r.who)} size="sm" />
							</li>
						))}
					</ul>

					<div className="mt-3 flex justify-center">
						<div className="inline-flex items-center gap-1 rounded-full bg-brand-900 p-1.5 shadow-pop">
							{[
								{ icon: UserPlus, label: 'Assign' },
								{ icon: MessageSquare, label: 'Reply' },
								{ icon: Clock, label: 'Log time' },
								{ icon: Zap, label: 'Escalate' },
							].map(({ icon: Icon, label }) => (
								<span
									key={label}
									className="grid size-8 place-items-center rounded-full text-white/85"
									title={label}
								>
									<Icon size={14} strokeWidth={1.8} />
								</span>
							))}
							<span
								className="grid h-8 w-11 place-items-center rounded-full bg-success text-white"
								title="Resolve"
							>
								<Check size={15} strokeWidth={2.2} />
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function ChannelTile({ channel, count }: { channel: keyof typeof channelMeta; count: number }) {
	const meta = channelMeta[channel];
	const Icon = meta.icon;
	return (
		<div className="flex flex-col justify-between rounded-[14px] border border-border bg-white p-3 shadow-card" aria-hidden>
			<span className={cn('grid size-8 place-items-center rounded-full bg-muted', meta.color)}>
				<Icon size={15} strokeWidth={1.8} />
			</span>
			<span>
				<b className="tabular block text-[18px] leading-none font-semibold text-t1">{count}</b>
				<span className="mt-1 block text-[11px] text-t2">{meta.label} · new</span>
			</span>
		</div>
	);
}

function VisitCard() {
	return (
		<div
			className="w-[220px] -rotate-6 overflow-hidden rounded-[14px] border border-border bg-white shadow-pop"
			aria-hidden
		>
			<div className="relative h-[86px] bg-[linear-gradient(135deg,#d9eef2,#eef1f4)]">
				<svg
					className="absolute inset-0 size-full opacity-60"
					viewBox="0 0 220 86"
					fill="none"
					stroke="#2e6f86"
					strokeWidth="1.2"
				>
					<path d="M-10 60 C 40 55, 60 20, 110 30 S 190 70, 240 40" />
					<path d="M20 -5 L 70 90 M120 -5 L 150 90" strokeDasharray="3 4" />
				</svg>
				<span className="absolute top-8 left-24 grid size-7 place-items-center rounded-full bg-brand-900 text-white shadow-pop">
					<MapPin size={13} />
				</span>
			</div>
			<div className="p-3">
				<div className="flex items-center gap-2">
					<Avatar name="Chinedu Eze" tint="teal" src={photoOf('Chinedu Eze')} size="sm" />
					<span className="min-w-0">
						<b className="block truncate text-[12px] font-semibold text-t1">
							Chinedu Eze
						</b>
						<span className="block text-[11px] text-t2">
							Lekki Fintech · 09:30
						</span>
					</span>
					<Pill tone="teal" className="ml-auto">
						En route
					</Pill>
				</div>
			</div>
		</div>
	);
}

function ChatBubble() {
	return (
		<div className="w-[236px] rotate-3 rounded-[16px] rounded-bl-[4px] border border-border bg-white/95 p-3 shadow-pop backdrop-blur" aria-hidden>
			<div className="mb-1 flex items-center gap-1.5 text-[10px] text-success-fg">
				<MessageSquare size={11} /> WhatsApp · Adaeze O.
			</div>
			<p className="text-[12px] leading-snug text-t1">
				Hi Mrs Bello, the engineer is on his way, <span className="text-t3">ETA 25 min…</span>
			</p>
		</div>
	);
}
