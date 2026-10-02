// Shared backdrop for every screen an operator sees before the console shell
// mounts: sign-in, "not an operator", "add a second factor", "session ended".
//
// These are one flow, not four unrelated pages — an operator can land on any
// of them depending on what the server already knows, and bouncing between a
// dark sign-in screen and a flat light one on every hop reads as broken
// navigation rather than a gate doing its job. The pattern also visually
// separates "you are outside the console" from the console's own light
// interior (`ConsoleShell`), which matters here specifically because this is
// the internal operator surface, not the product.

import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import patternBg from '@/assets/patterns/pattern8.webp';

export function ConsoleAuthBackdrop({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				'relative grid min-h-[100dvh] place-items-center overflow-hidden px-5 py-10',
				className,
			)}
			style={{
				// A wash in the console's own brand tones, not the product's marketing
				// gradient — the pattern is deliberately washed near-out; it reads as
				// texture on the dark surface, not as decoration competing with the card.
				backgroundImage: `linear-gradient(165deg, rgba(22, 48, 58, .94), rgba(47, 95, 112, .88)), url(${patternBg})`,
				backgroundSize: 'auto, 320px 320px',
				backgroundRepeat: 'no-repeat, repeat',
				backgroundPosition: 'center, center',
			}}
		>
			<div
				className="pointer-events-none absolute top-1/2 left-1/2 h-[680px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-3xl"
				style={{
					background:
						'radial-gradient(circle, rgba(46,111,134,.55), transparent 70%)',
				}}
				aria-hidden
			/>

			<ShieldCheck
				className="pointer-events-none absolute -right-16 -bottom-16 text-white opacity-[.05]"
				size={420}
				strokeWidth={0.6}
				aria-hidden
			/>

			<div className="relative w-full">{children}</div>
		</div>
	);
}

/** "Internal" tag reused from the console shell header, so identity carries into the auth flow. */
export function ConsoleInternalBadge() {
	return (
		<span className="rounded-sm bg-danger-bg px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-danger-fg uppercase">
			Internal
		</span>
	);
}
