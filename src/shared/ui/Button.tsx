import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant;
	size?: Size;
	loading?: boolean;
	block?: boolean;
	iconOnly?: boolean;
}

const variants: Record<Variant, string> = {
	primary: 'bg-brand-900 border-brand-900 text-white hover:bg-brand-800 hover:border-brand-800',
	secondary: 'bg-white border-border-strong text-t1 hover:bg-muted',
	ghost: 'bg-transparent border-transparent text-t2 hover:bg-muted hover:text-t1',
	soft: 'bg-brand-100 border-brand-100 text-brand-900 hover:bg-[#cfe6ec]',
	danger: 'bg-danger border-danger text-white hover:bg-[#c53030]',
};

const sizes: Record<Size, string> = {
	sm: 'h-[30px] px-2.5 text-xs gap-1.5',
	md: 'h-9 px-3.5 text-[13px] gap-2',
	lg: 'h-[42px] px-4 text-sm gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{ variant = 'secondary', size = 'md', loading, block, iconOnly, className, children, disabled, ...rest },
	ref,
) {
	return (
		<button
			ref={ref}
			disabled={disabled || loading}
			className={cn(
				'inline-flex items-center justify-center rounded-sm border font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
				variants[variant],
				sizes[size],
				iconOnly && (size === 'sm' ? 'w-[30px] px-0' : size === 'lg' ? 'w-[42px] px-0' : 'w-9 px-0'),
				block && 'w-full',
				className,
			)}
			{...rest}
		>
			{loading ? <Loader2 className="animate-spin" size={16} aria-hidden /> : null}
			{children}
		</button>
	);
});
