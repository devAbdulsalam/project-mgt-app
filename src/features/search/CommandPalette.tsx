import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Search, User, Users, Check, Flag, LayoutGrid, Inbox, Ticket as TicketIcon, Folder, Columns3, Bell, Settings, Plus, Bookmark, ArrowRight, Zap } from 'lucide-react';
import { Kbd, StatusPill, TypeDot } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/shared/lib/auth-store';
import { usePaletteStore } from '@/shared/lib/palette-store';
import { toast } from '@/shared/lib/toast-store';
import { memberById, useDb } from '@/mocks/db';
import { transitions, allPriorities } from '@/mocks/seed';
import { priorityLabel } from '@/shared/ui/meta';
import { matchesQuery, savedViews } from '@/features/tickets/model/filters';
import { parseQuery } from './query';

interface Item {
	id: string;
	section: string;
	icon?: ReactNode;
	label: ReactNode;
	hint?: ReactNode;
	keys?: string[];
	right?: ReactNode;
	run: () => void;
}

export function CommandPalette() {
	const open = usePaletteStore((s) => s.open);
	const toggle = usePaletteStore((s) => s.toggle);
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				toggle();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [toggle]);
	if (!open) return null;
	return <PaletteDialog />;
}

/** Mounted only while open, so search/selection state resets naturally. */
function PaletteDialog() {
	const setOpen = usePaletteStore((s) => s.setOpen);
	const focusedKey = usePaletteStore((s) => s.focusedKey);
	const navigate = useNavigate();
	const org = useAuthStore((s) => s.org);
	const user = useAuthStore((s) => s.user);
	const params = useParams({ strict: false }) as { key?: string };
	const tickets = useDb((s) => s.tickets);
	const projects = useDb((s) => s.projects);
	const members = useDb((s) => s.members);
	const assign = useDb((s) => s.assign);
	const transition = useDb((s) => s.transition);
	const setPriority = useDb((s) => s.setPriority);
	const [q, setQRaw] = useState('');
	const [active, setActive] = useState(0);
	const [assignMode, setAssignModeRaw] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const setQ = (v: string) => {
		setQRaw(v);
		setActive(0);
	};
	const setAssignMode = (v: boolean) => {
		setAssignModeRaw(v);
		setActive(0);
	};

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const contextKey = params.key ?? focusedKey;
	const ctx = contextKey ? tickets.find((t) => t.key === contextKey) : undefined;
	const actor = { id: user?.id ?? 'anon', name: user?.name ?? 'Someone' };
	const slug = org?.slug ?? '';
	const close = () => setOpen(false);
	const go = (fn: () => void) => () => {
		close();
		fn();
	};

	const commandMode = q.startsWith('>');
	const query = commandMode ? q.slice(1).trim() : q.trim();
	const parsed = parseQuery(query);
	const fuzzy = (s: string) => !query || s.toLowerCase().includes(query.toLowerCase()) || query.toLowerCase().split(/\s+/).every((w) => s.toLowerCase().includes(w));

	const items = useMemo<Item[]>(() => {
		if (!org) return [];
		const out: Item[] = [];

		if (assignMode && ctx) {
			members
				.filter((m) => m.status === 'Active' && fuzzy(m.name))
				.forEach((m) =>
					out.push({
						id: `assign-${m.id}`,
						section: `Assign ${ctx.key} to`,
						icon: <User size={16} />,
						label: m.name,
						hint: m.role,
						run: go(() => {
							assign(ctx.key, m.id, actor);
							toast(`${ctx.key} assigned to ${m.name}`, { tone: 'success' });
						}),
					}),
				);
			return out;
		}

		if (ctx) {
			const sec = `Actions on ${ctx.key}`;
			const mine = ctx.assigneeId === actor.id;
			const acts: Item[] = [
				{ id: 'assign-me', section: sec, icon: <User size={16} />, label: <b>{mine ? 'Unassign me' : 'Assign to me'}</b>, hint: actor.name, keys: ['A'], run: go(() => { assign(ctx.key, mine ? undefined : actor.id, actor); toast(mine ? `${ctx.key} unassigned` : `${ctx.key} assigned to you`, { tone: 'success' }); }) },
				{ id: 'assign-to', section: sec, icon: <Users size={16} />, label: 'Assign to…', hint: 'choose a person', keys: ['⇧A'], run: () => { setAssignMode(true); setQ(''); } },
				...transitions[ctx.status].map((s) => ({ id: `move-${s}`, section: sec, icon: <Check size={16} />, label: `Move to ${s}`, hint: `from ${ctx.status}`, run: go(() => { transition(ctx.key, s, actor); toast(`${ctx.key} moved to ${s}`, { tone: 'success' }); }) })),
				...allPriorities.filter((p) => p !== ctx.priority).map((p) => ({ id: `prio-${p}`, section: sec, icon: <Flag size={16} />, label: `Set priority ${p} · ${priorityLabel[p]}`, run: go(() => { setPriority(ctx.key, p, actor); toast(`${ctx.key} set to ${p}`, { tone: 'success' }); }) })),
				{ id: 'auto', section: sec, icon: <Zap size={16} />, label: <span>Run automation: <b>Auto-assign by asset</b></span>, run: go(() => { const eng = members.find((m) => m.role === 'Field engineer' && m.status === 'Active'); if (eng) { assign(ctx.key, eng.id, actor); toast(`Automation assigned ${ctx.key} to ${eng.name}`, { tone: 'success' }); } }) },
			];
			out.push(...acts.filter((a) => fuzzy(typeof a.label === 'string' ? a.label : a.id.replace(/-/g, ' ') + ' assign move set priority automation')));
		}

		if (!commandMode || query) {
			const nav: Item[] = [
				{ id: 'nav-dash', section: 'Navigate', icon: <LayoutGrid size={16} />, label: 'Dashboard', keys: ['G', 'D'], run: go(() => navigate({ to: '/$org/dashboard', params: { org: slug }, search: {} })) },
				{ id: 'nav-inbox', section: 'Navigate', icon: <Inbox size={16} />, label: 'My Work', keys: ['G', 'W'], run: go(() => navigate({ to: '/$org/inbox', params: { org: slug }, search: {} })) },
				{ id: 'nav-tickets', section: 'Navigate', icon: <TicketIcon size={16} />, label: 'Tickets', keys: ['G', 'T'], run: go(() => navigate({ to: '/$org/tickets', params: { org: slug }, search: {} })) },
				{ id: 'nav-projects', section: 'Navigate', icon: <Folder size={16} />, label: 'Projects', keys: ['G', 'P'], run: go(() => navigate({ to: '/$org/projects', params: { org: slug }, search: {} })) },
				...projects.filter((p) => !p.archived).flatMap((p) => [
					{ id: `nav-board-${p.key}`, section: 'Navigate', icon: <Columns3 size={16} />, label: `${p.name} board`, hint: `Projects › ${p.name}`, keys: p.key === 'PB' ? ['G', 'B'] : undefined, run: go(() => navigate({ to: '/$org/projects/$projectKey/board', params: { org: slug, projectKey: p.key }, search: {} })) },
					{ id: `nav-overview-${p.key}`, section: 'Navigate', icon: <Folder size={16} />, label: `${p.name} overview`, hint: `Projects › ${p.name}`, run: go(() => navigate({ to: '/$org/projects/$projectKey/overview', params: { org: slug, projectKey: p.key } })) },
				]),
				{ id: 'nav-notif', section: 'Navigate', icon: <Bell size={16} />, label: 'Notifications', run: go(() => navigate({ to: '/$org/notifications', params: { org: slug }, search: {} })) },
				{ id: 'nav-team', section: 'Navigate', icon: <Users size={16} />, label: 'Team', run: go(() => navigate({ to: '/$org/users', params: { org: slug }, search: {} })) },
				{ id: 'nav-settings', section: 'Navigate', icon: <Settings size={16} />, label: 'Settings', run: go(() => navigate({ to: '/$org/settings', params: { org: slug } })) },
				...savedViews.map((v) => ({ id: `view-${v.id}`, section: 'Navigate', icon: <Bookmark size={16} />, label: v.name, hint: 'saved view', run: go(() => navigate({ to: '/$org/tickets', params: { org: slug }, search: { ...v.search } })) })),
				{ id: 'create', section: 'Navigate', icon: <Plus size={16} />, label: 'Create ticket', keys: ['C'], run: go(() => navigate({ to: '/$org/tickets/new', params: { org: slug }, search: {} })) },
			];
			out.push(...nav.filter((n) => fuzzy(`${typeof n.label === 'string' ? n.label : ''} ${n.hint ?? ''}`)));
		}

		if (!commandMode && query) {
			if (parsed.structured) {
				out.push({
					id: 'structured',
					section: 'Search',
					icon: <Search size={16} />,
					label: <span>Open tickets matching <b>{query}</b></span>,
					right: <ArrowRight size={14} />,
					run: go(() => navigate({ to: '/$org/tickets', params: { org: slug }, search: { ...parsed.search, q: parsed.text || undefined } })),
				});
			}
			const text = parsed.text || query;
			tickets
				.filter((t) => matchesQuery(t, text))
				.slice(0, 6)
				.forEach((t) =>
					out.push({
						id: `t-${t.key}`,
						section: 'Tickets',
						icon: <TypeDot type={t.type} />,
						label: (
							<span className="flex min-w-0 items-center gap-2">
								<span className="font-mono text-xs text-t2">{t.key}</span>
								<span className="truncate">{t.title}</span>
								<StatusPill status={t.status} />
							</span>
						),
						right: <span className="text-xs text-t3">{memberById(t.assigneeId)?.name.split(' ')[0] ?? 'unassigned'}</span>,
						run: go(() => navigate({ to: '/$org/tickets/$key', params: { org: slug, key: t.key }, search: {} })),
					}),
				);
		}
		return out;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [q, ctx, tickets, projects, members, assignMode, org, slug, user?.id]);

	useEffect(() => {
		listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
	}, [active]);

	const sections = Array.from(new Set(items.map((i) => i.section)));

	return (
		<div className="fixed inset-0 z-[70] flex justify-center bg-[rgba(27,42,50,.35)] px-4 pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && close()}>
			<div className="flex h-max max-h-[70vh] w-full max-w-[680px] flex-col overflow-hidden rounded-[14px] bg-white shadow-pop" role="dialog" aria-modal="true" aria-label="Command palette">
				<div className="flex items-center gap-3 border-b border-border px-4.5 py-3.5">
					<Search size={18} className="text-t2" aria-hidden />
					<input
						ref={inputRef}
						value={q}
						onChange={(e) => setQ(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
							else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
							else if (e.key === 'Enter') { e.preventDefault(); items[active]?.run(); }
							else if (e.key === 'Escape') { if (assignMode) setAssignMode(false); else close(); }
							else if (e.key === 'Backspace' && !q && assignMode) setAssignMode(false);
						}}
						placeholder={assignMode ? 'Type a name…' : 'Search tickets, jump to a page, or run an action…'}
						className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-t3"
						aria-label="Command"
						aria-activedescendant={items[active] ? `pal-${items[active].id}` : undefined}
					/>
					<span className="hidden text-xs text-t3 sm:inline">
						Type <Kbd>&gt;</Kbd> for commands
					</span>
				</div>
				<div ref={listRef} className="min-h-0 flex-1 overflow-y-auto py-1" role="listbox">
					{items.length === 0 ? <p className="px-4.5 py-6 text-center text-[13px] text-t3">No matches.</p> : null}
					{sections.map((sec) => (
						<div key={sec}>
							<div className="px-4.5 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-t2 uppercase">{sec}</div>
							{items.map((it, i) =>
								it.section === sec ? (
									<button
										key={it.id}
										id={`pal-${it.id}`}
										data-index={i}
										role="option"
										aria-selected={i === active}
										type="button"
										onMouseEnter={() => setActive(i)}
										onClick={it.run}
										className={cn('flex w-full items-center gap-3 px-4.5 py-2.5 text-left text-[13px]', i === active ? 'bg-brand-100' : 'hover:bg-muted')}
									>
										<span className={cn('flex w-4 shrink-0 justify-center', i === active ? 'text-brand-900' : 'text-t2')}>{it.icon}</span>
										<span className="min-w-0 flex-1 truncate">{it.label}</span>
										{it.hint ? <span className="hidden truncate text-t2 sm:inline">{it.hint}</span> : null}
										{it.right}
										{it.keys ? (
											<span className="ms-2 hidden gap-1 sm:flex">
												{it.keys.map((k) => (
													<Kbd key={k}>{k}</Kbd>
												))}
											</span>
										) : null}
									</button>
								) : null,
							)}
						</div>
					))}
				</div>
				<div className="flex flex-wrap items-center gap-4 border-t border-border bg-[#fafbfc] px-4.5 py-2.5 text-[11px] text-t2">
					<span><Kbd>↑↓</Kbd> navigate</span>
					<span><Kbd>↵</Kbd> select</span>
					<span><Kbd>esc</Kbd> close</span>
					<span className="ms-auto hidden sm:inline">
						Try <b>status:open assignee:me priority&gt;=high</b>
					</span>
				</div>
			</div>
		</div>
	);
}
