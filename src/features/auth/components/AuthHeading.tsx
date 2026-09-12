import type { ReactNode } from 'react';

export function AuthHeading({ title, children }: { title: ReactNode; children?: ReactNode }) {
	return (
		<>
			<h2 className="mb-1.5 text-2xl font-semibold text-t1">{title}</h2>
			{children ? <p className="mb-6 text-sm text-t2">{children}</p> : null}
		</>
	);
}

export function FormError({ message }: { message?: string }) {
	if (!message) return null;
	return (
		<div role="alert" className="mb-4 rounded-sm border border-danger-bg bg-danger-bg/60 px-3 py-2.5 text-[13px] text-danger-fg">
			{message}
		</div>
	);
}
