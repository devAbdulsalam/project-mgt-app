import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TourStatus = 'idle' | 'choosing' | 'video' | 'interactive' | 'done';

interface TourState {
	status: TourStatus;
	stepIndex: number;
	/** Highest step the user has reached, for the chapter checklist. */
	maxStep: number;
	completedAt?: number;
	videoWatchedAt?: number;
	dismissedAt?: number;
	promptShown: boolean;
	dontShowAgain: boolean;
	/** Set right after a successful sign-in so the chooser opens once on the first authed page. */
	loginPending: boolean;

	flagLogin: () => void;
	clearLogin: () => void;
	openChoice: () => void;
	startVideo: () => void;
	startInteractive: (from?: number) => void;
	next: (total: number) => void;
	back: () => void;
	goTo: (i: number) => void;
	exit: () => void;
	finish: () => void;
	finishVideo: () => void;
	markPromptShown: () => void;
	setDontShowAgain: (v: boolean) => void;
	reset: () => void;
}

export const useTourStore = create<TourState>()(
	persist(
		(set, get) => ({
			status: 'idle',
			stepIndex: 0,
			maxStep: 0,
			promptShown: false,
			dontShowAgain: false,
			loginPending: false,

			flagLogin: () => set({ loginPending: true }),
			clearLogin: () => set({ loginPending: false }),
			openChoice: () => set({ status: 'choosing', promptShown: true }),
			startVideo: () => set({ status: 'video', promptShown: true }),
			startInteractive: (from) => set({ status: 'interactive', stepIndex: from ?? 0, promptShown: true }),
			next: (total) => {
				const i = get().stepIndex + 1;
				if (i >= total) return set({ status: 'done', completedAt: Date.now(), maxStep: total - 1 });
				set({ stepIndex: i, maxStep: Math.max(get().maxStep, i) });
			},
			back: () => set({ stepIndex: Math.max(0, get().stepIndex - 1) }),
			goTo: (i) => set({ stepIndex: i, maxStep: Math.max(get().maxStep, i), status: 'interactive' }),
			exit: () => set({ status: 'idle', dismissedAt: Date.now() }),
			finish: () => set({ status: 'idle', completedAt: Date.now() }),
			finishVideo: () => set({ status: 'idle', videoWatchedAt: Date.now() }),
			markPromptShown: () => set({ promptShown: true }),
			setDontShowAgain: (v) => set({ dontShowAgain: v }),
			reset: () => set({ status: 'idle', stepIndex: 0, maxStep: 0, completedAt: undefined, videoWatchedAt: undefined, dismissedAt: undefined, promptShown: false, dontShowAgain: false }),
		}),
		{
			name: 'ledgedesk.tour',
			partialize: (s) => ({ stepIndex: s.stepIndex, maxStep: s.maxStep, completedAt: s.completedAt, videoWatchedAt: s.videoWatchedAt, dismissedAt: s.dismissedAt, promptShown: s.promptShown, dontShowAgain: s.dontShowAgain }),
		},
	),
);
