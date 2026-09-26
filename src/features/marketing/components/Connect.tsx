import { Avatar, tintRings } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { Reveal } from './Reveal';
import { Parallax } from './Parallax';
import { Tag, container } from './bits';
import { photoOf } from '../people';

const floaters = [
	{ name: 'Amina Yusuf', tint: 'tan', pos: 'left-[4%] top-[8%]', speed: -0.10, label: { text: 'Centralise every channel', tone: 'teal', side: 'right' } },
	{ name: 'Sara Ali', tint: 'lavender', pos: 'right-[6%] top-[2%] hidden sm:block', speed: -0.07 },
	{ name: 'Ibrahim Musa', tint: 'green', pos: 'left-[18%] bottom-[10%] hidden md:block', speed: -0.14 },
	{ name: 'Emeka Nwosu', tint: 'teal', pos: 'right-[10%] bottom-[14%]', speed: -0.09, label: { text: 'Of course! Let’s do it', tone: 'green', side: 'left' } },
	{ name: 'Funke Adeyemi', tint: 'grey', pos: 'right-[26%] -bottom-[2%] hidden lg:block', speed: -0.05 },
	{ name: 'Chinedu Eze', tint: 'teal', pos: 'left-[30%] -top-[4%] hidden lg:block', speed: -0.04, label: { text: 'Visit confirmed · 09:30', tone: 'tan', side: 'right' } },
] as const;

export function Connect() {
	return (
		<section className="relative overflow-hidden py-20 sm:py-28">
			<div className={cn(container, 'relative min-h-[360px] sm:min-h-[420px]')}>
				{floaters.map((f, i) => (
					<Parallax key={f.name} speed={f.speed} className={cn('absolute z-10', f.pos)}>
						<Reveal delay={i * 90} variant="scale" className={cn('flex items-center gap-2', 'label' in f && f.label?.side === 'left' && 'flex-row-reverse')}>
							<span className="relative">
								<Avatar name={f.name} tint={f.tint} src={photoOf(f.name)} size="lg" className={cn('size-12 text-sm ring-4 shadow-pop sm:size-14', tintRings[f.tint])} />
								<span className="absolute right-0.5 bottom-0.5 size-3 rounded-full border-2 border-white bg-success" />
							</span>
							{'label' in f && f.label ? <Tag tone={f.label.tone}>{f.label.text}</Tag> : null}
						</Reveal>
					</Parallax>
				))}

				<div className="relative z-0 grid min-h-[360px] place-items-center px-6 text-center sm:min-h-[420px]">
					<Reveal as="h2" className="max-w-[720px] text-[30px] leading-[1.14] font-semibold tracking-[-0.02em] text-t1 sm:text-[40px] lg:text-[46px]">
						Because we know how important it is to stay <span className="text-brand-600">connected</span> with the people you serve
					</Reveal>
				</div>
			</div>
		</section>
	);
}
