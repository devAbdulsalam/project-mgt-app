import { cn } from '@/shared/lib/cn';
import { initials } from '@/shared/lib/format';

export type Tint = 'teal' | 'tan' | 'green' | 'lavender' | 'grey' | 'dark';
type Size = 'xs' | 'sm' | 'md' | 'lg';

const tints: Record<Tint, string> = {
	teal: 'bg-brand-100 text-brand-900',
	tan: 'bg-tan-bg text-tan-fg',
	green: 'bg-green-bg text-green-fg',
	lavender: 'bg-lavender-bg text-lavender-fg',
	grey: 'bg-grey-bg text-grey-fg',
	dark: 'bg-brand-800 text-white border border-white/20',
};

const sizes: Record<Size, string> = {
	xs: 'size-5 text-[8px]',
	sm: 'size-6 text-[9px]',
	md: 'size-8 text-[11px]',
	lg: 'size-10 text-xs',
};

export function Avatar({ name, tint = 'teal', size = 'md', className, src }: { name: string; tint?: Tint; size?: Size; className?: string; src?: string }) {
	return (
		<span
			className={cn('inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-bold select-none', tints[tint], sizes[size], className)}
			aria-hidden
			title={name}
		>
			{src ? <img src={src} alt="" className="size-full object-cover" /> : initials(name)}
		</span>
	);
}
