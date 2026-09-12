import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { Check, ChevronDown, ChevronLeft, ChevronRight, MousePointerClick, PlayCircle, X } from 'lucide-react';
import { Button, Menu } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { chapters, steps, totalSteps, type Placement, type TourStep } from './content';
import { useTourStore } from './store';

const PAD = 8;
const POP_W = 360;

interface Rect { top: number; left: number; width: number; height: number }

function isMobile() {
	return typeof window !== 'undefined' && window.innerWidth < 1024;
}

function targetFor(step: TourStep) {
	if (isMobile()) return step.mobileTarget === undefined ? step.target : step.mobileTarget ?? undefined;
	return step.target;
}

function findVisible(selector: string): HTMLElement | undefined {
	const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${selector}"]`));
	return els.find((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
}

function measure(el: HTMLElement): Rect {
	const r = el.getBoundingClientRect();
	return { top: Math.max(0, r.top - PAD), left: Math.max(0, r.left - PAD), width: Math.min(window.innerWidth, r.width + PAD * 2), height: Math.min(window.innerHeight, r.height + PAD * 2) };
}

function place(rect: Rect | undefined, preferred: Placement | undefined): { style: React.CSSProperties; side: Placement } {
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	const w = Math.min(POP_W, vw - 24);
	const h = 300;
	if (!rect || vw < 640) return { style: { left: '50%', bottom: vw < 640 ? 'calc(var(--spacing-tabbar) + 16px)' : 'auto', top: vw < 640 ? 'auto' : '50%', transform: vw < 640 ? 'translateX(-50%)' : 'translate(-50%, -50%)', width: w }, side: 'auto' };
	const order: Placement[] = preferred && preferred !== 'auto' ? [preferred, 'bottom', 'top', 'right', 'left'] : ['bottom', 'top', 'right', 'left'];
	const fits = (p: Placement) => (p === 'bottom' ? rect.top + rect.height + h + 16 < vh : p === 'top' ? rect.top - h - 16 > 0 : p === 'right' ? rect.left + rect.width + w + 16 < vw : rect.left - w - 16 > 0);
	const side = order.find(fits) ?? 'bottom';
	const clampX = (x: number) => Math.max(12, Math.min(vw - w - 12, x));
	const clampY = (y: number) => Math.max(12, Math.min(vh - h - 12, y));
	if (side === 'bottom') return { style: { top: rect.top + rect.height + 12, left: clampX(rect.left + rect.width / 2 - w / 2), width: w }, side };
	if (side === 'top') return { style: { top: Math.max(12, rect.top - 12 - h), left: clampX(rect.left + rect.width / 2 - w / 2), width: w }, side };
	if (side === 'right') return { style: { top: clampY(rect.top), left: rect.left + rect.width + 12, width: w }, side };
	return { style: { top: clampY(rect.top), left: Math.max(12, rect.left - 12 - w), width: w }, side };
}

/** Spotlight + coach-mark engine for the clickable tour. Mounted once per AppShell. */
export function TourOverlay() {
	const status = useTourStore((s) => s.status);
	const stepIndex = useTourStore((s) => s.stepIndex);
	const maxStep = useTourStore((s) => s.maxStep);
	const next = useTourStore((s) => s.next);
	const back = useTourStore((s) => s.back);
	const goTo = useTourStore((s) => s.goTo);
	const exit = useTourStore((s) => s.exit);
	const finish = useTourStore((s) => s.finish);
	const startVideo = useTourStore((s) => s.startVideo);
	const org = useAuthStore((s) => s.org);
	const navigate = useNavigate();
	const location = useLocation();
	const [rect, setRect] = useState<Rect>();
	const [searching, setSearching] = useState(false);
	const elRef = useRef<HTMLElement | undefined>(undefined);
	const active = status === 'interactive' || status === 'done';
	const step = steps[Math.min(stepIndex, totalSteps - 1)]!;

	const desiredPath = org ? step.route.path.replace('$org', org.slug) : '';
	const onRoute = location.pathname === desiredPath && (!step.route.search || Object.entries(step.route.search).every(([k, v]) => (location.search as Record<string, unknown>)[k] === v));

	// Navigate to the step's page when needed.
	useEffect(() => {
		if (status !== 'interactive' || !org || onRoute) return;
		navigate({ to: desiredPath as '/', search: (step.route.search ?? {}) as never, replace: false });
	}, [status, org, onRoute, desiredPath, navigate, step.route.search]);

	// Locate the target once we are on the right page; poll briefly for lazy content.
	const locate = useCallback(() => {
		const sel = targetFor(step);
		if (!sel) { elRef.current = undefined; setRect(undefined); return true; }
		const el = findVisible(sel);
		if (!el) return false;
		elRef.current = el;
		setRect(measure(el));
		return true;
	}, [step]);

	useEffect(() => {
		if (status !== 'interactive' || !onRoute) return;
		let tries = 0;
		let done = false;
		const tick = () => {
			if (done) return;
			if (locate()) {
				done = true;
				setSearching(false);
				const el = elRef.current;
				if (el) {
					el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
					setTimeout(() => elRef.current && setRect(measure(elRef.current)), 400);
				}
				return;
			}
			if (++tries > 40) { done = true; setSearching(false); elRef.current = undefined; setRect(undefined); return; }
			setTimeout(tick, 100);
		};
		const start = setTimeout(() => { setSearching(true); tick(); }, 0);
		return () => { done = true; clearTimeout(start); };
	}, [status, onRoute, locate, stepIndex]);

	// Keep the spotlight glued to the element on resize/scroll.
	useEffect(() => {
		if (status !== 'interactive') return;
		const update = () => elRef.current && setRect(measure(elRef.current));
		window.addEventListener('resize', update);
		document.addEventListener('scroll', update, true);
		const id = setInterval(update, 500);
		return () => { window.removeEventListener('resize', update); document.removeEventListener('scroll', update, true); clearInterval(id); };
	}, [status, stepIndex]);

	// Keyboard.
	useEffect(() => {
		if (!active) return;
		const onKey = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
			if (e.key === 'Escape') { e.preventDefault(); if (status === 'done') finish(); else exit(); }
			if (status !== 'interactive') return;
			if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(totalSteps); }
			if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [active, status, next, back, exit, finish]);

	if (!active || !org) return null;

	const chapter = chapters.find((c) => c.id === step.chapter)!;
	const chapterIndex = chapters.indexOf(chapter);
	const { style: popStyle } = place(rect, step.placement);
	const vw = window.innerWidth;
	const vh = window.innerHeight;

	const popover = (
		<div className="fixed z-[72] rounded-[14px] border border-border bg-white p-4 text-t1 shadow-pop" style={popStyle} role="dialog" aria-modal="false" aria-labelledby="tour-title" data-tour-popover>
			{status === 'done' ? (
				<div className="text-center">
					<span className="mx-auto grid size-12 place-items-center rounded-full bg-success-bg text-success-fg"><Check size={24} /></span>
					<h3 id="tour-title" className="mt-3 text-[17px] font-semibold">You've seen the whole app</h3>
					<p className="mt-1 text-[13px] text-t2">{totalSteps} steps across {chapters.length} chapters. Reopen the tour any time from the help menu, or watch the video for a recap.</p>
					<div className="mt-4 flex flex-wrap justify-center gap-2">
						<Button variant="primary" onClick={finish}>Start working</Button>
						<Button onClick={() => { finish(); startVideo(); }}><PlayCircle size={15} aria-hidden /> Watch the video</Button>
						<Button variant="ghost" onClick={() => goTo(0)}>Replay</Button>
					</div>
				</div>
			) : (
				<>
					<div className="flex items-center gap-2 pe-7 text-[11px] font-semibold tracking-wider text-t2 uppercase">
						<Menu
							width="w-64"
							header="Jump to chapter"
							trigger={({ toggle, buttonProps }) => <button type="button" onClick={toggle} className="flex items-center gap-1 rounded-sm px-1 py-0.5 hover:bg-muted" {...buttonProps}>{chapter.icon} {chapter.name} <ChevronDown size={12} aria-hidden /></button>}
							items={chapters.map((c, i) => { const first = steps.findIndex((s) => s.chapter === c.id); const seen = first <= maxStep; return { key: c.id, label: `${c.icon} ${c.name}`, hint: seen ? '✓' : `${steps.filter((s) => s.chapter === c.id).length} steps`, selected: i === chapterIndex, onSelect: () => goTo(first) }; })}
						/>
						<span className="ms-auto tabular normal-case">Step {stepIndex + 1} of {totalSteps}</span>
					</div>
					<div className="mt-2 flex h-1 gap-0.5" aria-hidden>{chapters.map((c, i) => <span key={c.id} className={cn('flex-1 rounded-full', i < chapterIndex ? 'bg-brand-900' : i === chapterIndex ? 'bg-brand-600' : 'bg-muted')} />)}</div>
					<h3 id="tour-title" className="mt-3 text-[15px] font-semibold">{step.title}</h3>
					<p className="mt-1 text-[13px] leading-relaxed text-t2">{step.body}</p>
					{step.tip ? <p className="mt-2 rounded-sm bg-brand-100/60 px-2.5 py-1.5 text-xs text-brand-900">💡 {step.tip}</p> : null}
					{!rect && !searching ? <p className="mt-2 text-xs text-t3">This part is on the page behind the card{isMobile() ? ' (some controls are desktop only)' : ''}.</p> : null}
					<div className="mt-4 flex items-center gap-2">
						<button type="button" onClick={exit} className="text-xs text-t2 hover:underline">Skip tour</button>
						<div className="ms-auto flex gap-2">
							<Button size="md" onClick={back} disabled={stepIndex === 0} aria-label="Back"><ChevronLeft size={14} /> Back</Button>
							<Button size="md" variant="primary" onClick={() => next(totalSteps)} data-tour-next>{stepIndex === totalSteps - 1 ? 'Finish' : 'Next'} <ChevronRight size={14} aria-hidden /></Button>
						</div>
					</div>
					<div className="mt-2 hidden text-[11px] text-t3 sm:block">→ next · ← back · Esc to leave · you can click the highlighted area</div>
				</>
			)}
			<button type="button" onClick={status === 'done' ? finish : exit} className="absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-sm text-t3 hover:bg-muted hover:text-t1" aria-label="Close tour"><X size={14} /></button>
		</div>
	);

	const shade = 'fixed z-[71] bg-[rgba(15,27,33,.55)] transition-all duration-200';
	return createPortal(
		<>
			{rect && status === 'interactive' ? (
				<>
					<div className={shade} style={{ top: 0, left: 0, width: vw, height: rect.top }} onClick={(e) => e.stopPropagation()} />
					<div className={shade} style={{ top: rect.top + rect.height, left: 0, width: vw, height: Math.max(0, vh - rect.top - rect.height) }} />
					<div className={shade} style={{ top: rect.top, left: 0, width: rect.left, height: rect.height }} />
					<div className={shade} style={{ top: rect.top, left: rect.left + rect.width, width: Math.max(0, vw - rect.left - rect.width), height: rect.height }} />
					<div className="pointer-events-none fixed z-[71] rounded-[10px] ring-2 ring-[#8fd3b5] shadow-[0_0_0_4px_rgba(143,211,181,.35)] transition-all duration-200" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} aria-hidden />
				</>
			) : (
				<div className="fixed inset-0 z-[71] bg-[rgba(15,27,33,.55)]" />
			)}
			{popover}
			<span className="sr-only" aria-live="polite">{status === 'done' ? 'Tour complete' : `Tour step ${stepIndex + 1} of ${totalSteps}: ${step.title}`}</span>
		</>,
		document.body,
	);
}

export function TourLauncherIcon() {
	return <MousePointerClick size={14} aria-hidden />;
}
