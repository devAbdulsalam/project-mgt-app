import { useEffect, useState } from 'react';

export function useCountdown(seconds: number) {
	const [remaining, setRemaining] = useState(seconds);
	useEffect(() => {
		if (remaining <= 0) return;
		const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
		return () => clearInterval(id);
	}, [remaining]);
	const m = Math.floor(remaining / 60);
	const s = remaining % 60;
	return { remaining, label: `${m}:${s.toString().padStart(2, '0')}`, reset: () => setRemaining(seconds) };
}
