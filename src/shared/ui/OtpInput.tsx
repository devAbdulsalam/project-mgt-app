import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/shared/lib/cn';

export function OtpInput({ value, onChange, length = 6, invalid, disabled, onDark }: { value: string; onChange: (v: string) => void; length?: number; invalid?: boolean; disabled?: boolean; onDark?: boolean }) {
	const refs = useRef<Array<HTMLInputElement | null>>([]);
	const digits = Array.from({ length }, (_, i) => value[i] ?? '');

	const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

	const setAt = (i: number, ch: string) => {
		const next = digits.slice();
		next[i] = ch;
		onChange(next.join('').slice(0, length));
	};

	const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Backspace') {
			e.preventDefault();
			if (digits[i]) setAt(i, '');
			else {
				setAt(i - 1, '');
				focus(i - 1);
			}
		} else if (e.key === 'ArrowLeft') focus(i - 1);
		else if (e.key === 'ArrowRight') focus(i + 1);
	};

	const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
		const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
		if (text) {
			e.preventDefault();
			onChange(text);
			focus(text.length);
		}
	};

	return (
		<div className="flex justify-between gap-2" role="group" aria-label="One-time code">
			{digits.map((d, i) => (
				<input
					key={i}
					ref={(el) => {
						refs.current[i] = el;
					}}
					inputMode="numeric"
					pattern="[0-9]*"
					autoComplete={i === 0 ? 'one-time-code' : 'off'}
					maxLength={1}
					disabled={disabled}
					aria-label={`Digit ${i + 1}`}
					aria-invalid={invalid || undefined}
					value={d}
					onChange={(e) => {
						const ch = e.target.value.replace(/\D/g, '').slice(-1);
						if (!ch) return;
						setAt(i, ch);
						focus(i + 1);
					}}
					onKeyDown={(e) => onKey(i, e)}
					onPaste={onPaste}
					onFocus={(e) => e.target.select()}
					className={cn(
						'h-[58px] w-full max-w-[54px] rounded-[10px] border bg-white text-center text-2xl font-semibold text-t1 outline-none transition-shadow',
						'focus:border-brand-600 focus:shadow-[0_0_0_3px_rgba(46,111,134,.15)]',
						invalid ? 'border-danger' : onDark && !d ? 'border-white/20 bg-white/10' : 'border-border-strong',
					)}
				/>
			))}
		</div>
	);
}
