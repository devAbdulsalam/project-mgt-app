import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Menu, X } from 'lucide-react';
import { Wordmark } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useScrolled } from '../hooks/useScrolled';
import { container } from './bits';

const links = [
	{ label: 'Product', href: '#product' },
	{ label: 'Solutions', href: '#solutions' },
	{ label: 'Resources', href: '#resources' },
	{ label: 'Pricing', href: '#pricing' },
];

export function Nav() {
	const ref = useScrolled<HTMLElement>();
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (!open) return;
		const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
		window.addEventListener('keydown', close);
		return () => window.removeEventListener('keydown', close);
	}, [open]);

	return (
		<header
			ref={ref}
			className="group/nav sticky top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300 data-[scrolled=true]:bg-white/85 data-[scrolled=true]:shadow-[0_1px_0_var(--color-border)] data-[scrolled=true]:backdrop-blur-md"
		>
			<div className={cn(container, 'flex h-[68px] items-center gap-6 transition-[height] duration-300 group-data-[scrolled=true]/nav:h-[60px]')}>
				<Link to="/" className="shrink-0" aria-label="Ledge Desk home">
					<Wordmark light={false} />
				</Link>

				<nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Primary">
					{links.map((l) => (
						<a key={l.href} href={l.href} className="rounded-full px-3.5 py-2 text-[13.5px] font-medium text-t2 transition-colors hover:bg-muted hover:text-t1">
							{l.label}
						</a>
					))}
				</nav>

				<div className="ml-auto hidden items-center gap-2 md:flex">
					<Link to="/login" search={{}} className="rounded-full px-4 py-2 text-[13.5px] font-medium text-t2 transition-colors hover:bg-muted hover:text-t1">
						Sign in
					</Link>
					<Link to="/signup" className="rounded-full border border-border-strong bg-white px-5 py-2.5 text-[13.5px] font-semibold text-t1 shadow-card transition-all hover:-translate-y-px hover:border-brand-900 hover:bg-brand-900 hover:text-white">
						Get Started
					</Link>
				</div>

				<button
					type="button"
					className="ml-auto grid size-10 place-items-center rounded-full text-t1 hover:bg-muted md:hidden"
					aria-expanded={open}
					aria-controls="mobile-nav"
					aria-label={open ? 'Close menu' : 'Open menu'}
					onClick={() => setOpen((v) => !v)}
				>
					{open ? <X size={20} /> : <Menu size={20} />}
				</button>
			</div>

			<div id="mobile-nav" hidden={!open} className="border-t border-border bg-white/95 backdrop-blur-md md:hidden">
				<div className={cn(container, 'flex flex-col gap-1 py-3')}>
					{links.map((l) => (
						<a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-[15px] font-medium text-t1 hover:bg-muted">
							{l.label}
						</a>
					))}
					<div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-3">
						<Link to="/login" search={{}} className="rounded-full border border-border-strong py-2.5 text-center text-[14px] font-medium">Sign in</Link>
						<Link to="/signup" className="rounded-full bg-brand-900 py-2.5 text-center text-[14px] font-semibold text-white">Get Started</Link>
					</div>
				</div>
			</div>
		</header>
	);
}
