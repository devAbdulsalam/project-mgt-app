import { Ticket } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
	return (
		<span className={cn('grid shrink-0 place-items-center rounded-full bg-brand-800 text-white', className)} style={{ width: size, height: size }} aria-hidden>
			<Ticket size={Math.round(size / 2)} strokeWidth={1.7} />
		</span>
	);
}

export function Wordmark({ sub, className, light = true }: { sub?: string; className?: string; light?: boolean }) {
	return (
		<span className={cn('flex items-center gap-2.5', className)}>
			<LogoMark size={sub ? 34 : 36} />
			<span className="leading-tight">
				<b className={cn('block text-[15px] font-semibold', light ? 'text-white' : 'text-t1')}>Ledge Desk</b>
				{sub ? <span className={cn('block text-[11px]', light ? 'text-on-dark-muted' : 'text-t2')}>{sub}</span> : null}
			</span>
		</span>
	);
}

/** Large faint ticket outline used in the auth panel corner. */
export function TicketWatermark() {
	return (
		<svg className="pointer-events-none absolute -right-[120px] -bottom-[120px] opacity-[.12]" width="520" height="520" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth=".6" aria-hidden>
			<path d="M3 9a2 2 0 0 0 2-2V5h14v2a2 2 0 0 0 0 4v0a2 2 0 0 0 0 4v2H5v-2a2 2 0 0 0-2-2z" />
			<path d="M13 5v14" />
		</svg>
	);
}
