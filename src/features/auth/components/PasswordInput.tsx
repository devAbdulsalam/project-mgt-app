import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input, type InputProps } from '@/shared/ui';
import { passwordStrength } from '../lib/password';

export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'trailing'>>(function PasswordInput(props, ref) {
	const [show, setShow] = useState(false);
	return (
		<Input
			ref={ref}
			type={show ? 'text' : 'password'}
			autoComplete="current-password"
			trailing={
				<button type="button" onClick={() => setShow((s) => !s)} className="text-t2 hover:text-t1" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
					{show ? <Eye size={15} /> : <EyeOff size={15} />}
				</button>
			}
			{...props}
		/>
	);
});

export function PasswordStrengthMeter({ password }: { password: string }) {
	const { score, label } = passwordStrength(password);
	if (!password) return null;
	const color = score >= 4 ? 'bg-success' : score >= 3 ? 'bg-[#8ac926]' : score >= 2 ? 'bg-warning' : 'bg-danger';
	const textColor = score >= 3 ? 'text-success-fg' : score >= 2 ? 'text-warning-fg' : 'text-danger-fg';
	return (
		<div className="mt-2 flex items-center gap-1" aria-live="polite">
			{[0, 1, 2, 3].map((i) => (
				<span key={i} className={`h-1 flex-1 rounded-sm ${i < score ? color : 'bg-border'}`} />
			))}
			<span className={`ms-2 text-[11px] ${textColor}`}>{label}</span>
		</div>
	);
}
