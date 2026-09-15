import { Link } from '@tanstack/react-router';
import { Globe, Mail, MessageCircle, Play, Smartphone } from 'lucide-react';
import { Wordmark } from '@/shared/ui';
import { Reveal } from './Reveal';

const columns = [
	{ title: 'Product', links: ['Helpdesk', 'Field visits', 'Assets', 'Projects & sprints', 'Client portal'] },
	{ title: 'Company', links: ['About', 'Customers', 'Careers', 'Contact'] },
	{ title: 'Resources', links: ['Help centre', 'API docs', 'Status', 'Security'] },
];

export function Footer() {
	return (
		<Reveal
			as="footer"
			variant="fade"
			className="mx-auto max-w-[1200px] px-5 pb-8 sm:px-8"
		>
			<div className="rounded-[24px] border border-border bg-muted p-6 shadow-card sm:p-10">
				<div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(3,minmax(0,0.7fr))_1fr]">
					<div>
						<Wordmark light={false} />
						<p className="mt-4 max-w-[300px] text-[13px] leading-relaxed text-t2">
							Ledge Desk brings support tickets, field engineers, assets and
							project work together, so service teams keep every promise they
							make.
						</p>
						<div className="mt-5 flex gap-2">
							{[
								{ icon: Globe, label: 'Website' },
								{ icon: MessageCircle, label: 'WhatsApp' },
								{ icon: Mail, label: 'Email' },
							].map(({ icon: Icon, label }) => (
								<a
									key={label}
									href="#product"
									aria-label={label}
									className="grid size-9 place-items-center rounded-full bg-brand-900 text-white transition-colors hover:bg-brand-800"
								>
									<Icon size={15} aria-hidden />
								</a>
							))}
						</div>
					</div>

					{columns.map((c) => (
						<nav key={c.title} aria-label={c.title}>
							<h4 className="text-[13px] font-semibold text-t1">{c.title}</h4>
							<ul className="mt-3 flex flex-col gap-2">
								{c.links.map((l) => (
									<li key={l}>
										<a
											href="#product"
											className="text-[13px] text-t2 transition-colors hover:text-t1"
										>
											{l}
										</a>
									</li>
								))}
							</ul>
						</nav>
					))}

					<div>
						<h4 className="text-[13px] font-semibold text-t1">Get the app</h4>
						<div className="mt-3 flex flex-col gap-2">
							<a
								href="#product"
								className="btn-pill btn-pill-dark h-10 justify-start px-4 text-[12px]"
							>
								<Play size={14} aria-hidden /> Google Play
							</a>
							<a
								href="#product"
								className="btn-pill btn-pill-dark h-10 justify-start px-4 text-[12px]"
							>
								<Smartphone size={14} aria-hidden /> App Store
							</a>
						</div>
						<h4 className="mt-6 text-[13px] font-semibold text-t1">
							Contact us
						</h4>
						<p className="mt-2 text-[13px] leading-relaxed text-t2">
							+234 1 700 0000
							<br />
							support@ledgedesk.ng
						</p>
						<h4 className="mt-5 text-[13px] font-semibold text-t1">Location</h4>
						<p className="mt-2 text-[13px] leading-relaxed text-t2">
							14 Adeola Odeku Street
							<br />
							Victoria Island, Lagos
						</p>
					</div>
				</div>

				<div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-[12px] text-t3 sm:flex-row sm:items-center sm:justify-between">
					<span>© 2026 Ledge Desk · NDPR compliant · SOC 2 Type II</span>
					<div className="flex items-center gap-4">
						<Link to="/login" search={{}} className="hover:text-t1">
							Sign in
						</Link>
						<a href="#product" className="hover:text-t1">
							Privacy
						</a>
						<a href="#product" className="hover:text-t1">
							Terms
						</a>
						<span>Language: English</span>
					</div>
				</div>
			</div>
		</Reveal>
	);
}
