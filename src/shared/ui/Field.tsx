import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface FieldProps {
	label: ReactNode;
	hint?: ReactNode;
	error?: string;
	children: (id: string, describedBy: string | undefined) => ReactNode;
	className?: string;
	required?: boolean;
}

export function Field({ label, hint, error, children, className, required }: FieldProps) {
	const id = useId();
	const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
	return (
		<div className={cn('min-w-0', className)}>
			<label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-t2">
				{label}
				{required ? <em className="not-italic text-danger"> *</em> : null}
				{hint ? (
					<span id={`${id}-hint`} className="font-normal text-t3">
						{' '}
						{hint}
					</span>
				) : null}
			</label>
			{children(id, describedBy)}
			{error ? (
				<p id={`${id}-err`} role="alert" className="mt-1.5 text-xs text-danger">
					{error}
				</p>
			) : null}
		</div>
	);
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	leading?: ReactNode;
	trailing?: ReactNode;
	invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ leading, trailing, invalid, className, ...rest }, ref) {
	return (
		<div className={cn('input', className)} aria-invalid={invalid || undefined}>
			{leading ? <span className="flex shrink-0 text-t2">{leading}</span> : null}
			<input ref={ref} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-t3" aria-invalid={invalid || undefined} {...rest} />
			{trailing ? <span className="flex shrink-0 items-center text-t2">{trailing}</span> : null}
		</div>
	);
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
	leading?: ReactNode;
	invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ leading, invalid, className, children, ...rest }, ref) {
	return (
		<div className={cn('input relative pr-0', className)} aria-invalid={invalid || undefined}>
			{leading ? <span className="flex shrink-0 text-t2">{leading}</span> : null}
			<select ref={ref} className="min-w-0 flex-1 appearance-none bg-transparent pr-8 outline-none" {...rest}>
				{children}
			</select>
			<ChevronDown size={14} className="pointer-events-none absolute right-3 text-t2" aria-hidden />
		</div>
	);
});

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
	label: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, className, ...rest }, ref) {
	return (
		<label className={cn('flex cursor-pointer items-start gap-2 text-[13px] text-t2', className)}>
			<input ref={ref} type="checkbox" className="mt-0.5 size-4 shrink-0 accent-brand-900" {...rest} />
			<span>{label}</span>
		</label>
	);
});
