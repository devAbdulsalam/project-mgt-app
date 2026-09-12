import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

function GoogleIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
			<path fill="#4285F4" d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.6a4.8 4.8 0 0 1-2.1 3.1v2.6h3.4c2-1.8 3.1-4.5 3.1-7.6z" />
			<path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.4-2.6c-.9.6-2 1-3.2 1-2.5 0-4.6-1.7-5.4-4H3.1v2.6A10 10 0 0 0 12 22z" />
			<path fill="#FBBC05" d="M6.6 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9z" />
			<path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5L6.6 10c.8-2.3 2.9-4 5.4-4z" />
		</svg>
	);
}

function MicrosoftIcon() {
	return (
		<svg width="16" height="16" viewBox="0 0 23 23" aria-hidden>
			<path fill="#f35325" d="M1 1h10v10H1z" />
			<path fill="#81bc06" d="M12 1h10v10H12z" />
			<path fill="#05a6f0" d="M1 12h10v10H1z" />
			<path fill="#ffba08" d="M12 12h10v10H12z" />
		</svg>
	);
}

const icons: Record<'google' | 'microsoft' | 'sso', ReactNode> = {
	google: <GoogleIcon />,
	microsoft: <MicrosoftIcon />,
	sso: <Lock size={15} aria-hidden />,
};

export function SsoButton({ provider, children, className, ...rest }: { provider: 'google' | 'microsoft' | 'sso' } & ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			type="button"
			className={cn(
				'flex h-[42px] w-full items-center justify-center gap-2.5 rounded-sm border border-border-strong bg-white text-[13px] font-medium text-t1 transition-colors hover:bg-muted',
				className,
			)}
			{...rest}
		>
			{icons[provider]}
			{children}
		</button>
	);
}

export function OrDivider({ children }: { children: ReactNode }) {
	return (
		<div className="my-[18px] flex items-center gap-3 text-xs text-t3 before:flex-1 before:border-t before:border-border after:flex-1 after:border-t after:border-border">{children}</div>
	);
}
