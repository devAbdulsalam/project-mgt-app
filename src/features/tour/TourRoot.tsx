import { useEffect, useRef } from 'react';
import { useSearch } from '@tanstack/react-router';
import { useAuthStore } from '@/shared/lib/auth-store';
import { TourChoiceDialog } from './TourChoiceDialog';
import { VideoTour } from './VideoTour';
import { TourOverlay } from './TourOverlay';
import { useTourStore } from './store';

/**
 * Mounts the tour UI and decides when to offer it:
 *  - `?tour=choice|video|interactive` on any authed page opens that mode (used right after signup).
 *  - Signed-in users who have never seen the prompt get a one-time toast with a "Take a tour" action.
 */
export function TourRoot() {
	const search = useSearch({ strict: false }) as { tour?: string };
	const status = useTourStore((s) => s.status);
	const promptShown = useTourStore((s) => s.promptShown);
	const completedAt = useTourStore((s) => s.completedAt);
	const dontShowAgain = useTourStore((s) => s.dontShowAgain);
	const openChoice = useTourStore((s) => s.openChoice);
	const startVideo = useTourStore((s) => s.startVideo);
	const startInteractive = useTourStore((s) => s.startInteractive);
	const markPromptShown = useTourStore((s) => s.markPromptShown);
	const loginPending = useTourStore((s) => s.loginPending);
	const clearLogin = useTourStore((s) => s.clearLogin);
	const user = useAuthStore((s) => s.user);
	const handled = useRef<string | undefined>(undefined);

	useEffect(() => {
		const mode = search.tour;
		if (!mode || handled.current === mode) return;
		handled.current = mode;
		if (mode === 'video') startVideo();
		else if (mode === 'interactive') startInteractive(0);
		else openChoice();
	}, [search.tour, openChoice, startVideo, startInteractive]);

	// On sign-in (and on the very first visit) open the chooser, unless the user opted out or already finished the tour.
	useEffect(() => {
		if (!user || status !== 'idle' || search.tour) return;
		const shouldOffer = (loginPending || !promptShown) && !dontShowAgain && !completedAt;
		if (loginPending) clearLogin();
		if (!shouldOffer) return;
		const id = setTimeout(() => {
			markPromptShown();
			openChoice();
		}, 700);
		return () => clearTimeout(id);
	}, [loginPending, promptShown, dontShowAgain, completedAt, status, search.tour, user, markPromptShown, openChoice, clearLogin]);

	return (
		<>
			<TourChoiceDialog />
			<VideoTour />
			<TourOverlay />
		</>
	);
}
