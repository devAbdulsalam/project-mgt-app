import { Clock, MousePointerClick, PlayCircle, Sparkles } from 'lucide-react';
import { Button, Checkbox, Dialog } from '@/shared/ui';
import { useAuthStore } from '@/shared/lib/auth-store';
import { chapters, totalSteps, videoTotalSeconds } from './content';
import { useTourStore } from './store';

/** Shown after signup (and from Help). Lets the user pick the video or the clickable tour. */
export function TourChoiceDialog() {
	const status = useTourStore((s) => s.status);
	const startVideo = useTourStore((s) => s.startVideo);
	const startInteractive = useTourStore((s) => s.startInteractive);
	const exit = useTourStore((s) => s.exit);
	const dontShowAgain = useTourStore((s) => s.dontShowAgain);
	const setDontShowAgain = useTourStore((s) => s.setDontShowAgain);
	const completedAt = useTourStore((s) => s.completedAt);
	const maxStep = useTourStore((s) => s.maxStep);
	const user = useAuthStore((s) => s.user);
	const open = status === 'choosing';
	const firstName = user?.name.split(' ')[0] ?? 'there';
	const minutes = Math.round(videoTotalSeconds / 60);

	return (
		<Dialog open={open} onClose={exit} width="max-w-[720px]" title={undefined} header={<span className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={16} className="text-brand-600" aria-hidden /> Welcome to Ledge Desk</span>}>
			<div className="px-5 py-6 sm:px-8">
				<h2 className="text-2xl font-semibold">How would you like to learn the app, {firstName}?</h2>
				<p className="mt-1.5 text-[13px] text-t2">Both cover the helpdesk, field visits, projects, clients, reports and settings. You can stop any time and pick up later from the help menu.</p>

				<div className="mt-6 grid gap-4 sm:grid-cols-2">
					<button type="button" onClick={startVideo} className="group rounded-[14px] border border-border-strong bg-white p-5 text-left transition-colors hover:border-brand-600 hover:bg-brand-100/40 focus-visible:border-brand-600" data-tour-choice="video">
						<span className="grid size-12 place-items-center rounded-[12px] bg-lavender-bg text-lavender-fg"><PlayCircle size={24} aria-hidden /></span>
						<b className="mt-4 block text-[15px]">Watch the opening video</b>
						<span className="mt-1 block text-[13px] text-t2">A guided walkthrough of every screen with captions. Sit back, or skip between chapters.</span>
						<span className="mt-3 flex items-center gap-1.5 text-xs text-t2"><Clock size={12} aria-hidden /> About {minutes} minutes · {chapters.length} chapters</span>
					</button>
					<button type="button" onClick={() => startInteractive(0)} className="group rounded-[14px] border border-brand-600 bg-brand-100/40 p-5 text-left transition-colors hover:bg-brand-100" data-tour-choice="interactive">
						<span className="grid size-12 place-items-center rounded-[12px] bg-brand-900 text-white"><MousePointerClick size={24} aria-hidden /></span>
						<b className="mt-4 block text-[15px]">Take the clickable tour <span className="ms-1 rounded-full bg-brand-900 px-2 py-px text-[10px] font-semibold text-white">Recommended</span></b>
						<span className="mt-1 block text-[13px] text-t2">Spotlights on the real app, page by page. You can click the highlighted parts as you go.</span>
						<span className="mt-3 flex items-center gap-1.5 text-xs text-t2"><Clock size={12} aria-hidden /> About 5 minutes · {totalSteps} steps{maxStep > 0 && !completedAt ? ` · resume at step ${maxStep + 1}` : ''}</span>
					</button>
				</div>

				<div className="mt-5 flex flex-wrap items-center justify-between gap-3">
					<Checkbox label="Don't show this again on sign-in" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} />
					<Button onClick={exit} data-tour-skip>Skip for now</Button>
				</div>
				<p className="mt-3 text-xs text-t3">You can restart either tour from the <b>?</b> help menu or Settings → General.</p>
			</div>
		</Dialog>
	);
}
