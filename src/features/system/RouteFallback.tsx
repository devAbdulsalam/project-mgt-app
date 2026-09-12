import { Loader2 } from 'lucide-react';

export function RouteFallback() {
	return (
		<div className="grid min-h-full place-items-center text-t3" role="status" aria-live="polite">
			<Loader2 className="animate-spin" size={22} aria-hidden />
			<span className="sr-only">Loading</span>
		</div>
	);
}
