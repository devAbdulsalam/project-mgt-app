import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Captions, ChevronLeft, ChevronRight, MousePointerClick, Pause, Play, RotateCcw, X } from 'lucide-react';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { videoChapters, videoTotalSeconds, type ScreenVariant } from './content';
import { useTourStore } from './store';

const REAL_VIDEO_URL = import.meta.env.VITE_TOUR_VIDEO_URL as string | undefined;

/** Illustrated "screen" for each chapter: simple product-like blocks with a pulsing highlight. */
function Screen({ variant, beat }: { variant: ScreenVariant; beat: number }) {
	const hl = (i: number) => (beat % 3 === i ? 'ring-2 ring-[#8fd3b5] shadow-[0_0_0_6px_rgba(143,211,181,.25)]' : '');
	const bar = 'rounded-[3px] bg-white/25';
	const chip = 'rounded-full px-1.5 text-[8px] font-semibold';
	if (variant === 'welcome' || variant === 'end') {
		return (
			<div className="flex h-full flex-col items-center justify-center text-center text-white">
				<span className="grid size-16 place-items-center rounded-full bg-white/10 text-3xl">{variant === 'welcome' ? '👋' : '🎉'}</span>
				<b className="mt-4 text-2xl font-semibold">{variant === 'welcome' ? 'Ledge Desk' : 'You are ready'}</b>
				<span className="mt-1 text-sm text-on-dark-muted">{variant === 'welcome' ? 'Helpdesk · Field visits · Projects · Clients' : 'Try the clickable tour or start working'}</span>
			</div>
		);
	}
	if (variant === 'mobile') {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="h-[86%] w-[42%] rounded-[18px] border-[6px] border-[#0f1b21] bg-canvas p-2 text-[8px]">
					<div className="rounded-md bg-brand-900 p-2 text-white"><div className="h-2 w-16 rounded bg-white/50" /><div className="mt-2 grid grid-cols-3 gap-1">{[0, 1, 2].map((i) => <div key={i} className={cn('h-8 rounded bg-white/15', hl(i))} />)}</div></div>
					<div className="mt-2 space-y-1.5">{[0, 1, 2].map((i) => <div key={i} className="h-9 rounded-md bg-white shadow-card"><div className="m-1.5 h-1.5 w-2/3 rounded bg-t1/20" /><div className="mx-1.5 h-1.5 w-1/3 rounded bg-brand-600/40" /></div>)}</div>
				</div>
			</div>
		);
	}
	return (
		<div className="flex h-full gap-2 p-3 text-[9px] text-white">
			<div className="flex w-[22%] flex-col gap-1 rounded-md bg-white/10 p-2"><div className="mb-1 h-2.5 w-2/3 rounded bg-white/50" />{['Dashboard', 'Tickets', 'Projects', 'Clients', 'Visits', 'Reports', 'Settings'].map((n, i) => <div key={n} className={cn('rounded px-1.5 py-1 text-[8px]', (variant === 'dashboard' && i === 0) || (variant === 'tickets' && i === 1) || (variant === 'detail' && i === 1) || (variant === 'board' && i === 2) || (variant === 'clients' && i === 3) || (variant === 'dispatch' && i === 4) || (variant === 'reports' && i === 5) || (variant === 'settings' && i === 6) ? 'bg-white/25 font-semibold' : 'text-white/60')}>{n}</div>)}</div>
			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<div className="flex h-5 items-center gap-2 rounded-md bg-white/10 px-2"><div className="h-2 w-16 rounded bg-white/50" /><div className="ms-auto h-3 w-24 rounded-full bg-white/15" /><div className="size-3 rounded-full bg-white/30" /></div>
				{variant === 'dashboard' ? (
					<>
						<div className="grid grid-cols-4 gap-2">{['164', '24 min', '91.6%', '4.6'].map((v, i) => <div key={v} className={cn('rounded-md bg-white/10 p-2', hl(i))}><div className="h-1.5 w-1/2 rounded bg-white/40" /><b className="mt-1.5 block text-sm">{v}</b></div>)}</div>
						<div className="grid flex-1 grid-cols-[1.6fr_1fr] gap-2"><div className="flex items-end gap-1.5 rounded-md bg-white/10 p-2">{[55, 52, 48, 58, 53, 20, 12].map((h, i) => <div key={i} className="flex-1 rounded-t bg-[#22a05b]/80" style={{ height: `${h}%` }} />)}</div><div className="rounded-md bg-white/10 p-2"><div className="mx-auto mt-1 size-12 rounded-full border-[6px] border-[#22a05b] border-r-[#e0a100]" /></div></div>
					</>
				) : variant === 'tickets' ? (
					<>
						<div className="flex gap-1.5">{['All open 27', 'Unassigned 5', 'My queue 5', 'SLA at risk 7'].map((t, i) => <span key={t} className={cn(chip, i === 0 ? 'bg-white text-brand-900' : 'bg-white/15', hl(i))}>{t}</span>)}</div>
						<div className="flex-1 space-y-1 rounded-md bg-white/10 p-2">{['KS-2044 Ransomware alert on file server', 'KS-2043 POS terminals offline at Ikeja branch', 'KS-2041 Office 365 mailbox migration', 'KS-2039 UPS not switching over', 'KS-2038 VPN drops on MTN network'].map((r, i) => <div key={r} className={cn('flex items-center gap-2 rounded bg-white/5 px-2 py-1', i === 1 && hl(1))}><span className="size-2 rounded-sm bg-[#e0a100]" /><span className="flex-1 truncate">{r}</span><span className={cn(chip, 'bg-[#fbdada] text-[#b91c1c]')}>P1</span><span className={cn(chip, 'bg-[#dcebfa] text-[#2b5aa0]')}>In progress</span><span className="text-[#ff8a8a]">0h 38m</span></div>)}</div>
					</>
				) : variant === 'detail' ? (
					<div className="grid flex-1 grid-cols-[1fr_38%] gap-2">
						<div className="space-y-2 rounded-md bg-white/10 p-2"><b className="block text-[11px]">POS terminals offline at Ikeja branch</b><div className="flex gap-1.5"><span className={cn(chip, 'bg-[#dcebfa] text-[#2b5aa0]', hl(0))}>● Dispatched ▾</span><span className={cn(chip, 'bg-white/20')}>✓ Resolve</span><span className={cn(chip, 'bg-white/20')}>Assign to me</span></div><div className="space-y-1">{[0, 1, 2].map((i) => <div key={i} className={cn(bar, 'h-1.5', i === 2 ? 'w-1/2' : 'w-full')} />)}</div><div className={cn('rounded bg-[#fdf3d0]/90 p-1.5 text-[8px] text-[#8a6a10]', hl(1))}>Internal note · @Chinedu spare 4G router in the van?</div><div className={cn('rounded bg-white/15 p-1.5 text-[8px]', hl(2))}>Reply on WhatsApp… <span className="float-right rounded bg-white/30 px-1">Send</span></div></div>
						<div className="space-y-1.5 rounded-md bg-white/10 p-2">{['Assignee · Chinedu Eze', 'Priority · Critical', 'Client · Lekki Fintech', 'SLA · 1h 05m left', 'Due · Today 17:00', 'Labels · network'].map((p) => <div key={p} className="rounded bg-white/5 px-1.5 py-1 text-[8px]">{p}</div>)}</div>
					</div>
				) : variant === 'board' ? (
					<div className="grid flex-1 grid-cols-4 gap-2">{[['To do', 3], ['In progress', 3], ['In review', 1], ['Done', 2]].map(([t, n], c) => <div key={t as string} className="rounded-md bg-white/10 p-1.5"><div className="mb-1.5 flex justify-between text-[8px]"><b>{t as string}</b><span className="text-white/60">{n as number}{c === 1 ? '/3' : ''}</span></div>{Array.from({ length: n as number }, (_, i) => <div key={i} className={cn('mb-1.5 rounded bg-white/15 p-1.5', c === 1 && i === 0 && hl(beat % 3))}><div className="h-1.5 w-2/3 rounded bg-white/50" /><div className="mt-1 flex justify-between"><span className={cn(chip, 'bg-[#ece3f7] text-[#6b3fa0]')}>PB-{84 + i * 4 + c}</span><span className="size-2.5 rounded-full bg-white/40" /></div></div>)}</div>)}</div>
				) : variant === 'dispatch' ? (
					<div className="grid flex-1 grid-cols-[30%_1fr] gap-2"><div className="space-y-1.5 rounded-md bg-white/10 p-2"><b className="text-[8px]">Unscheduled 3</b>{['KS-2039 UPS · P2', 'KS-2033 Imaging · P3', 'KS-2026 Server room · P4'].map((v, i) => <div key={v} className={cn('rounded bg-white/15 p-1.5 text-[8px]', i === 0 && hl(0))}>{v}</div>)}</div><div className="flex flex-col gap-2"><div className="relative flex-1 rounded-md bg-[#dbe4ea]/30">{[[24, 30, '#d93f3f'], [62, 55, '#e0a100'], [80, 35, '#c2410c']].map(([x, y, c]) => <span key={x as number} className="absolute size-3 rounded-full ring-2 ring-white/60" style={{ left: `${x}%`, top: `${y}%`, background: c as string }} />)}</div><div className="space-y-1.5 rounded-md bg-white/10 p-2">{['Chinedu', 'Ibrahim', 'Amina'].map((e, i) => <div key={e} className="flex items-center gap-2 text-[8px]"><span className="w-10">{e}</span><div className={cn('relative h-3 flex-1 rounded bg-white/10', i === 0 && hl(1))}><span className="absolute inset-y-0 left-[10%] w-[25%] rounded bg-[#d93f3f]/80" /><span className="absolute inset-y-0 left-[45%] w-[20%] rounded bg-[#2f5f70]" /></div></div>)}</div></div></div>
				) : variant === 'clients' ? (
					<div className="flex-1 space-y-1 rounded-md bg-white/10 p-2">{[['Lekki Fintech Ltd', 'Gold', '94%', '₦2.4M'], ['Surulere MFB', 'Gold', '95%', '₦2.1M'], ['Abuja Health Coop.', 'Silver', '88%', '₦1.15M'], ['Kano Textiles Plc', 'Bronze', '76%', '₦450k']].map((r, i) => <div key={r[0]} className={cn('flex items-center gap-2 rounded bg-white/5 px-2 py-1.5', i === 0 && hl(0), i === 3 && hl(2))}><span className="size-4 rounded-full bg-white/30" /><span className="flex-1">{r[0]}</span><span className={cn(chip, 'bg-white/20')}>{r[1]}</span><span className={cn(chip, r[2] === '76%' ? 'bg-[#fbdada] text-[#b91c1c]' : 'bg-[#ddf3e4] text-[#1e7a45]')}>{r[2]}</span><b>{r[3]}</b></div>)}</div>
				) : variant === 'reports' ? (
					<div className="grid flex-1 grid-cols-[1.5fr_1fr] gap-2"><div className={cn('relative rounded-md bg-white/10 p-2', hl(0))}><svg viewBox="0 0 100 40" className="h-full w-full" preserveAspectRatio="none"><path d="M0 22 L15 20 L30 24 L45 18 L60 21 L70 8 L80 20 L100 19" fill="none" stroke="#9fc7d8" strokeWidth="1.5" /><path d="M0 32 L20 31 L40 33 L60 31 L70 27 L85 32 L100 31" fill="none" stroke="#e0a100" strokeWidth="1.5" /><path d="M0 36 L100 35" stroke="#ff8a8a" strokeWidth="1.2" /><line x1="0" y1="26" x2="100" y2="26" stroke="#fff" strokeOpacity=".3" strokeDasharray="2 2" /></svg></div><div className={cn('grid grid-cols-6 gap-0.5 rounded-md bg-white/10 p-2', hl(1))}>{Array.from({ length: 36 }, (_, i) => <span key={i} className="rounded-[2px]" style={{ background: `rgba(159,199,216,${0.15 + ((i * 7) % 10) / 12})` }} />)}</div></div>
				) : (
					<div className="flex-1 space-y-2 rounded-md bg-white/10 p-2">{['Gold retainer · P1 15 min / 4h · 24/7', 'Silver · P1 30 min / 8h · extended', 'Bronze · P1 1h / 1d · business hours'].map((r, i) => <div key={r} className={cn('flex items-center gap-2 rounded bg-white/5 px-2 py-1.5 text-[8px]', hl(i))}><span className="flex-1">{r}</span><span className="h-2.5 w-5 rounded-full bg-[#8fd3b5]" /><span className="text-[#8fd3b5]">96%</span></div>)}<div className="rounded bg-white/5 px-2 py-1.5 text-[8px]">Automation · Auto-assign by asset · 142 runs</div></div>
				)}
			</div>
		</div>
	);
}

export function VideoTour() {
	const status = useTourStore((s) => s.status);
	if (status !== 'video') return null;
	return <VideoPlayer />;
}

interface PlayerState { chapter: number; elapsed: number; ended: boolean }

/** Mounted only while the video is open, so state resets naturally on close. */
function VideoPlayer() {
	const finishVideo = useTourStore((s) => s.finishVideo);
	const startInteractive = useTourStore((s) => s.startInteractive);
	const [ps, setPs] = useState<PlayerState>({ chapter: 0, elapsed: 0, ended: false });
	const [playingState, setPlaying] = useState(true);
	const [captions, setCaptions] = useState(true);
	const [speed, setSpeed] = useState(1);
	const videoRef = useRef<HTMLVideoElement>(null);
	const { chapter, elapsed, ended } = ps;
	const playing = playingState && !ended;
	const current = videoChapters[chapter]!;

	const jump = (i: number) => { setPs({ chapter: i, elapsed: 0, ended: false }); setPlaying(true); if (videoRef.current) videoRef.current.currentTime = videoChapters.slice(0, i).reduce((s, c) => s + c.seconds, 0); };

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') finishVideo();
			if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p); }
			if (e.key === 'ArrowRight') setPs((p) => ({ chapter: Math.min(videoChapters.length - 1, p.chapter + 1), elapsed: 0, ended: false }));
			if (e.key === 'ArrowLeft') setPs((p) => ({ chapter: Math.max(0, p.chapter - 1), elapsed: 0, ended: false }));
		};
		document.addEventListener('keydown', onKey);
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
	}, [finishVideo]);

	// Scripted playback: advance captions and chapters on a timer (real video drives itself).
	useEffect(() => {
		if (!playing || ended || REAL_VIDEO_URL) return;
		const id = setInterval(() => {
			setPs((p) => {
				const len = videoChapters[p.chapter]!.seconds;
				const e = p.elapsed + 0.1 * speed;
				if (e < len) return { ...p, elapsed: e };
				if (p.chapter >= videoChapters.length - 1) return { ...p, elapsed: len, ended: true };
				return { chapter: p.chapter + 1, elapsed: 0, ended: false };
			});
		}, 100);
		return () => clearInterval(id);
	}, [playing, ended, speed]);

	const before = videoChapters.slice(0, chapter).reduce((s, c) => s + c.seconds, 0);
	const overall = ((before + Math.min(elapsed, current.seconds)) / videoTotalSeconds) * 100;
	const captionIndex = Math.min(current.captions.length - 1, Math.floor((elapsed / current.seconds) * current.captions.length));
	const beat = Math.floor(elapsed / 3);
	const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
	return createPortal(
		<div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(15,27,33,.85)] p-0 sm:p-6" role="dialog" aria-modal="true" aria-label="Opening video tour">
			<div className="flex h-full w-full max-w-[1100px] flex-col overflow-hidden bg-[#0f1b21] text-white sm:h-auto sm:max-h-[92vh] sm:rounded-[16px]">
				<div className="flex items-center gap-3 px-4 py-3 sm:px-5">
					<span className="grid size-8 place-items-center rounded-full bg-brand-800 text-[13px] font-bold">LD</span>
					<div className="min-w-0"><b className="block truncate text-sm">Ledge Desk · opening tour</b><span className="text-xs text-on-dark-muted">Chapter {chapter + 1} of {videoChapters.length} · {current.title}</span></div>
					<button type="button" onClick={finishVideo} className="ms-auto grid size-9 place-items-center rounded-full hover:bg-white/10" aria-label="Close video"><X size={20} /></button>
				</div>

				<div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_260px]">
					<div className="flex min-h-0 flex-col">
						<div className="relative aspect-video w-full bg-[linear-gradient(160deg,var(--color-brand-900),var(--color-brand-950))]">
							{REAL_VIDEO_URL ? (
								<video ref={videoRef} src={REAL_VIDEO_URL} controls autoPlay className="h-full w-full" onTimeUpdate={(e) => { const t = e.currentTarget.currentTime; let acc = 0; for (let i = 0; i < videoChapters.length; i++) { if (t < acc + videoChapters[i]!.seconds) { setPs({ chapter: i, elapsed: t - acc, ended: false }); break; } acc += videoChapters[i]!.seconds; } }} onEnded={() => setPs((p) => ({ ...p, ended: true }))}>
									<track kind="captions" />
								</video>
							) : (
								<>
									<div className="absolute inset-0"><Screen variant={current.screen} beat={beat} /></div>
									{captions ? <div className="absolute inset-x-4 bottom-4 sm:inset-x-10 sm:bottom-6"><p className="mx-auto max-w-2xl rounded-md bg-black/60 px-4 py-2.5 text-center text-[13px] leading-relaxed sm:text-[15px]" aria-live="polite">{current.captions[captionIndex]}</p></div> : null}
									{!playing && !ended ? <button type="button" onClick={() => setPlaying(true)} className="absolute inset-0 grid place-items-center bg-black/30" aria-label="Play"><span className="grid size-16 place-items-center rounded-full bg-white/90 text-brand-900"><Play size={28} fill="currentColor" /></span></button> : null}
									{ended ? <div className="absolute inset-0 grid place-items-center bg-black/60"><div className="text-center"><b className="block text-xl">That's the tour</b><p className="mt-1 text-[13px] text-on-dark-muted">Try it hands-on, or start working.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><Button variant="primary" className="border-white bg-white text-brand-900 hover:bg-brand-100" onClick={() => { finishVideo(); startInteractive(0); }}><MousePointerClick size={15} aria-hidden /> Start clickable tour</Button><Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => jump(0)}><RotateCcw size={15} aria-hidden /> Replay</Button><Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={finishVideo}>Done</Button></div></div></div> : null}
								</>
							)}
						</div>

						{!REAL_VIDEO_URL ? (
							<div className="px-4 py-3 sm:px-5">
								<div className="flex h-1.5 gap-0.5" role="progressbar" aria-valuenow={Math.round(overall)} aria-valuemin={0} aria-valuemax={100} aria-label="Video progress">{videoChapters.map((c, i) => <button key={c.id} type="button" onClick={() => jump(i)} className="relative h-full overflow-hidden rounded-full bg-white/20" style={{ flex: c.seconds }} aria-label={`Go to chapter ${i + 1}: ${c.title}`}><span className="absolute inset-y-0 left-0 bg-[#8fd3b5]" style={{ width: i < chapter ? '100%' : i === chapter ? `${(Math.min(elapsed, c.seconds) / c.seconds) * 100}%` : '0%' }} /></button>)}</div>
								<div className="mt-2.5 flex flex-wrap items-center gap-2">
									<button type="button" onClick={() => jump(Math.max(0, chapter - 1))} className="grid size-9 place-items-center rounded-full hover:bg-white/10" aria-label="Previous chapter"><ChevronLeft size={18} /></button>
									<button type="button" onClick={() => (ended ? jump(0) : setPlaying((p) => !p))} className="grid size-10 place-items-center rounded-full bg-white text-brand-900" aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
									<button type="button" onClick={() => jump(Math.min(videoChapters.length - 1, chapter + 1))} className="grid size-9 place-items-center rounded-full hover:bg-white/10" aria-label="Next chapter"><ChevronRight size={18} /></button>
									<span className="tabular ms-1 text-xs text-on-dark-muted">{fmt(before + Math.min(elapsed, current.seconds))} / {fmt(videoTotalSeconds)}</span>
									<div className="ms-auto flex items-center gap-1.5">
										<button type="button" onClick={() => setSpeed(speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1)} className="rounded-full px-2.5 py-1 text-xs hover:bg-white/10" aria-label="Playback speed">{speed}×</button>
										<button type="button" onClick={() => setCaptions((c) => !c)} className={cn('grid size-9 place-items-center rounded-full hover:bg-white/10', captions && 'text-[#8fd3b5]')} aria-pressed={captions} aria-label="Captions"><Captions size={18} /></button>
									</div>
								</div>
							</div>
						) : null}
					</div>

					<aside className="min-h-0 overflow-y-auto border-t border-white/10 px-3 py-3 lg:border-t-0 lg:border-l">
						<div className="px-2 pb-2 text-[11px] font-semibold tracking-wider text-on-dark-muted uppercase">Chapters</div>
						<ol>{videoChapters.map((c, i) => <li key={c.id}><button type="button" onClick={() => jump(i)} className={cn('flex w-full items-center gap-2.5 rounded-[8px] px-2 py-2 text-left text-[13px] hover:bg-white/10', i === chapter && 'bg-white/15 font-semibold')} aria-current={i === chapter ? 'step' : undefined}><span className={cn('grid size-5 shrink-0 place-items-center rounded-full text-[10px]', i < chapter ? 'bg-[#8fd3b5] text-brand-950' : i === chapter ? 'bg-white text-brand-900' : 'bg-white/15')}>{i + 1}</span><span className="min-w-0 flex-1 truncate">{c.title}</span><span className="tabular text-[11px] text-on-dark-muted">{fmt(c.seconds)}</span></button></li>)}</ol>
						<div className="mt-3 border-t border-white/10 px-2 pt-3 text-xs text-on-dark-muted">Space to pause · ← → chapters · Esc to close</div>
					</aside>
				</div>
			</div>
		</div>,
		document.body,
	);
}
