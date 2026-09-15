import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';
import { plans } from '@/mocks/data';
import { cn } from '@/shared/lib/cn';
import { Reveal } from './Reveal';
import { SectionHeader } from './Section';

const features: Record<string, string[]> = {
	starter: ['Unlimited tickets and clients', 'Client portal and knowledge base', 'Email and portal intake', 'Basic reports'],
	growth: ['Everything in Starter', 'WhatsApp and phone channels', 'Field visits, dispatch and assets', 'SLA policies and automation', 'Boards, sprints and roadmaps'],
	enterprise: ['Everything in Growth', 'SSO (SAML / OIDC) and audit log', 'Custom roles and data retention', 'Dedicated success manager'],
};

export function Pricing() {
	return (
		<section id="pricing" className="mx-auto max-w-[1200px] scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
			<SectionHeader title={<>Simple pricing,<br className="hidden sm:block" /> billed in naira</>} cta={false}>
				Per agent, per month. Field engineers on the mobile app are free on every plan. Cancel anytime.
			</SectionHeader>

			<ul className="mt-10 grid gap-4 md:grid-cols-3">
				{plans.map((p, i) => (
					<Reveal as="li" key={p.id} delay={i * 110} className={cn('flex flex-col rounded-[20px] p-6', p.popular ? 'bg-brand-900 text-white shadow-pop md:-my-3' : 'border border-border bg-white text-t1 shadow-card')}>
						<div className="flex items-center justify-between">
							<h3 className="text-[16px] font-semibold">{p.name}</h3>
							{p.popular ? <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium">Most popular</span> : null}
						</div>
						<div className="mt-4 flex items-baseline gap-1">
							<b className="tabular text-[32px] leading-none font-semibold tracking-[-0.02em]">{p.price}</b>
							{p.per ? <span className={cn('text-[12px]', p.popular ? 'text-on-dark-muted' : 'text-t2')}>{p.per}</span> : null}
						</div>
						<p className={cn('mt-2 text-[13px]', p.popular ? 'text-on-dark-muted' : 'text-t2')}>{p.blurb}</p>
						<ul className="mt-5 flex flex-col gap-2.5 border-t pt-5 text-[13px]" style={{ borderColor: p.popular ? 'rgba(255,255,255,.12)' : 'var(--color-border)' }}>
							{features[p.id]?.map((f) => (
								<li key={f} className="flex items-start gap-2.5">
									<Check size={15} className={cn('mt-0.5 shrink-0', p.popular ? 'text-white' : 'text-success-fg')} aria-hidden />
									{f}
								</li>
							))}
						</ul>
						<Link to="/signup" className={cn('btn-pill mt-6 h-11 text-[13px]', p.popular ? 'bg-white text-brand-900 hover:bg-brand-100' : 'btn-pill-dark')}>
							{p.id === 'enterprise' ? 'Talk to sales' : 'Start free trial'}
						</Link>
					</Reveal>
				))}
			</ul>
		</section>
	);
}
