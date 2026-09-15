import { useId, useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Reveal } from './Reveal';
import { SectionHeader } from './Section';

const faqs = [
	{
		q: 'What is Ledge Desk?',
		a: 'A single desk for customer support and internal project work. Requests from WhatsApp, email, phone and your client portal land in one queue, and the same issues can be planned on boards and sprints alongside project tasks.',
	},
	{
		q: 'Do I need to install anything to use it?',
		a: 'No. Ledge Desk runs in the browser and installs as a home-screen app on Android and iPhone for engineers in the field. The queue is cached, so it opens instantly even on a weak connection.',
	},
	{
		q: 'Can my clients see their own tickets?',
		a: 'Yes. Each client gets a branded portal to raise requests, follow progress, approve parts and rate the resolution. Internal notes stay internal.',
	},
	{
		q: 'How do field visits work?',
		a: 'Dispatch engineers straight from the ticket, group jobs by area, and capture checkpoints, photos and signatures from the phone. The visit report attaches to the ticket automatically.',
	},
	{
		q: 'Is my data safe?',
		a: 'Data is encrypted in transit and at rest, roles control who sees what, and every change is written to an audit log. Ledge Desk is NDPR compliant and SOC 2 Type II audited.',
	},
];

export function Faq() {
	const [open, setOpen] = useState<number | null>(0);
	const base = useId();
	return (
		<section className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-24">
			<SectionHeader title="FAQs that lead to success">
				Everything teams ask before they move their queue over. Still unsure? Write to support@ledgedesk.ng and a person answers within a working day.
			</SectionHeader>

			<ul className="mt-10 flex flex-col gap-3">
				{faqs.map((f, i) => {
					const isOpen = open === i;
					const panelId = `${base}-p${i}`;
					const btnId = `${base}-b${i}`;
					return (
						<Reveal as="li" key={f.q} delay={i * 70} className={cn('rounded-[16px] border bg-white transition-colors', isOpen ? 'border-brand-600/40 shadow-card' : 'border-border')}>
							<h3>
								<button
									id={btnId}
									type="button"
									aria-expanded={isOpen}
									aria-controls={panelId}
									onClick={() => setOpen(isOpen ? null : i)}
									className="flex w-full items-center justify-between gap-4 rounded-[16px] px-5 py-4 text-left text-[15px] font-medium text-t1"
								>
									{f.q}
									<span className={cn('grid size-7 shrink-0 place-items-center rounded-full bg-muted text-t2 transition-transform duration-300', isOpen && 'rotate-45 bg-brand-100 text-brand-900')}>
										<Plus size={15} aria-hidden />
									</span>
								</button>
							</h3>
							<div id={panelId} role="region" aria-labelledby={btnId} className="acc-panel" data-open={isOpen}>
								<div>
									<p className="px-5 pb-5 text-[14px] leading-relaxed text-t2">{f.a}</p>
								</div>
							</div>
						</Reveal>
					);
				})}
			</ul>
		</section>
	);
}
