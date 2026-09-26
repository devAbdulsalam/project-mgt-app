import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
	HelpCircle,
	RefreshCw,
	Search,
	MoreVertical,
	LogOut,
	ChevronsUpDown,
	PanelLeftClose,
	PanelLeftOpen,
	Check,
	Menu as MenuIcon,
	X,
	PlayCircle,
	MousePointerClick,
	Keyboard,
	BookOpen,
} from 'lucide-react';
import { Menu } from '@/shared/ui/Menu';
import { TourRoot } from '@/features/tour/TourRoot';
import { useTourStore } from '@/features/tour/store';
import { useAuthStore } from '@/shared/lib/auth-store';
import { useUiStore } from '@/shared/lib/ui-store';
import { usePaletteStore } from '@/shared/lib/palette-store';
import { cn } from '@/shared/lib/cn';
import { useOverlayTransition } from '@/shared/lib/use-overlay-transition';
import { Avatar, LogoMark } from '@/shared/ui';
import { Toaster } from '@/shared/ui/Toaster';
import { CommandPalette } from '@/features/search/CommandPalette';
import { BellPopover } from '@/features/notifications/components/BellPopover';
import { useUnreadCount } from '@/features/notifications/api';
import { sidebarNav, mobileTabs } from './nav';
import { LogoutDialog } from './LogoutDialog';

export interface PageMeta {
	title: string;
	subtitle?: string;
}

/**
 * Desktop (lg+): fixed dark sidebar (collapsible) + white top bar.
 * Mobile: slim app bar with a menu drawer, then the dark page header supplied by the page, plus a bottom tab bar.
 */
export function AppShell({
	meta,
	children,
	mobileHeader,
}: {
	meta: PageMeta;
	children: ReactNode;
	mobileHeader?: ReactNode;
}) {
	const org = useAuthStore((s) => s.org)!;
	const [drawer, setDrawer] = useState(false);

	return (
		<div className="flex h-full min-h-0">
			<Sidebar />
			<div className="flex min-w-0 flex-1 flex-col">
				<TopBar meta={meta} />
				<div className="lg:hidden">
					<MobileAppBar onMenu={() => setDrawer(true)} title={meta.title} />
					{mobileHeader}
				</div>
				<main
					id="main"
					className="min-h-0 flex-1 overflow-y-auto pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom))] lg:pb-0"
				>
					<div className="mx-auto max-w-[1600px] p-4 lg:p-6">{children}</div>
				</main>
				<MobileTabBar orgSlug={org.slug} />
			</div>
			<MobileDrawer open={drawer} onClose={() => setDrawer(false)} />
			<CommandPalette />
			<TourRoot />
			<Toaster />
		</div>
	);
}

/** The badge count, from the API when live and the mock store otherwise. */
function useUnread() {
	return useUnreadCount();
}

// ---------- Desktop sidebar ----------

function OrgSwitcherMenu({
	onDone,
	className,
}: {
	onDone: () => void;
	className?: string;
}) {
	const org = useAuthStore((s) => s.org)!;
	const orgsAvailable = useAuthStore((s) => s.availableOrgs);
	const switchOrg = useAuthStore((s) => s.switchOrg);
	const navigate = useNavigate();
	return (
		<div
			role="menu"
			className={cn(
				'rounded-[10px] border border-border bg-white p-1 text-t1 shadow-pop',
				className,
			)}
		>
			<div className="px-2.5 py-1.5 text-[11px] font-semibold tracking-wider text-t3 uppercase">
				Switch organisation
			</div>
			{orgsAvailable.map((o) => (
				<button
					key={o.id}
					role="menuitem"
					type="button"
					onClick={() => {
						switchOrg(o.id);
						onDone();
						navigate({
							to: '/$org/dashboard',
							params: { org: o.slug },
							search: {},
						});
					}}
					className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-[13px] hover:bg-muted"
				>
					<span className="flex-1 truncate">{o.name}</span>
					{o.id === org.id ? (
						<Check size={14} className="text-brand-600" aria-label="current" />
					) : null}
				</button>
			))}
		</div>
	);
}

function NavLinks({
	collapsed,
	onNavigate,
	className,
	flow,
}: {
	collapsed?: boolean;
	onNavigate?: () => void;
	className?: string;
	/** Desktop sidebar: active item flows out of the content area (canvas tab with concave curves). */
	flow?: boolean;
}) {
	const org = useAuthStore((s) => s.org)!;
	const unread = useUnread();
	return (
		<nav
			className={cn('flex-1', flow ? 'overflow-visible' : 'overflow-y-auto', className)}
			aria-label="Primary"
			data-tour={collapsed ? undefined : 'nav'}
		>
			{sidebarNav.map((item) => (
				<Link
					key={item.to}
					to={`/$org/${item.to}` as '/$org/dashboard'}
					params={{ org: org.slug }}
					search={{}}
					onClick={onNavigate}
					title={collapsed ? item.label : undefined}
					className={cn(
						'relative mb-0.5 flex items-center gap-3 rounded-[10px] px-3.5 py-[11px] text-sm text-[#e6eef1] hover:bg-white/5',
						collapsed && 'justify-center px-0',
						flow
							? 'nav-flow my-1 data-[status=active]:font-semibold data-[status=active]:text-brand-900 data-[status=active]:hover:bg-canvas'
							: 'data-[status=active]:bg-brand-800 data-[status=active]:font-semibold data-[status=active]:text-white data-[status=active]:hover:bg-brand-800',
					)}
				>
					<item.icon
						size={18}
						strokeWidth={1.7}
						aria-hidden
						className="shrink-0"
					/>
					{!collapsed ? (
						<span className="flex-1 truncate">{item.label}</span>
					) : null}
					{item.badge && unread ? (
						<span
							className={cn(
								'nav-badge rounded-full bg-danger px-1.5 py-px text-[10px] font-bold text-white',
								collapsed && 'absolute top-1 right-2',
							)}
							aria-label={`${unread} unread`}
						>
							{unread}
						</span>
					) : null}
				</Link>
			))}
		</nav>
	);
}

function UserBlock({
	collapsed,
	onDone,
}: {
	collapsed?: boolean;
	onDone?: () => void;
}) {
	const user = useAuthStore((s) => s.user)!;
	const [open, setOpen] = useState(false);
	const [confirmSignOut, setConfirmSignOut] = useState(false);
	return (
		<div className="relative border-t border-white/10 pt-2">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className={cn(
					'flex w-full items-center gap-2.5 rounded-[10px] p-2 text-left hover:bg-white/5',
					collapsed && 'justify-center',
				)}
				aria-haspopup="menu"
				aria-expanded={open}
			>
				<Avatar name={user.name} tint="dark" src={user.avatarUrl} />
				{!collapsed ? (
					<>
						<span className="min-w-0 flex-1 leading-tight">
							<b className="block truncate text-xs font-semibold">
								{user.name}
							</b>
							<span className="block truncate text-[11px] text-on-dark-muted">
								{user.role}
							</span>
						</span>
						<MoreVertical
							size={16}
							className="text-on-dark-muted"
							aria-hidden
						/>
					</>
				) : null}
			</button>
			{/* Profile - Signout */}
			{open ? (
				<div
					role="menu"
					className="absolute inset-x-1 bottom-full z-20 mb-1 rounded-[10px] border border-border bg-white p-1 text-t1 shadow-pop"
				>
					<div className="px-2.5 py-2 text-xs text-t2">{user.email}</div>
					<Link
						to="/$org/me"
						params={{ org: useAuthStore.getState().org!.slug }}
						search={{}}
						role="menuitem"
						onClick={() => {
							setOpen(false);
							onDone?.();
						}}
						className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-[13px] hover:bg-muted"
					>
						Profile &amp; preferences
					</Link>
					<button
						role="menuitem"
						type="button"
						onClick={() => {
							setOpen(false);
							setConfirmSignOut(true);
						}}
						className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-[13px] hover:bg-muted"
					>
						<LogOut size={14} aria-hidden /> Sign out
					</button>
				</div>
			) : null}
			{/* Keeps the drawer mounted behind it, so cancelling leaves the menu where it was. */}
			<LogoutDialog open={confirmSignOut} onClose={() => setConfirmSignOut(false)} onDone={onDone} />
		</div>
	);
}

function Sidebar() {
	const org = useAuthStore((s) => s.org)!;
	const orgsAvailable = useAuthStore((s) => s.availableOrgs);
	const collapsed = useUiStore((s) => s.sidebarCollapsed);
	const toggle = useUiStore((s) => s.toggleSidebar);
	const [orgMenu, setOrgMenu] = useState(false);

	return (
		<aside
			className={cn(
				'hidden shrink-0 flex-col overflow-x-hidden overflow-y-auto bg-[linear-gradient(180deg,var(--color-brand-900),var(--color-brand-950))] px-3 py-4 text-white transition-[width] lg:flex',
				collapsed ? 'w-16' : 'w-sidebar',
			)}
		>
			{/* Brand row: logo + name, collapse control on the right */}
			<div className="relative pb-4">
				{collapsed ? (
					<div className="flex flex-col items-center gap-2">
						<LogoMark size={34} />
						<button
							type="button"
							onClick={toggle}
							className="grid size-8 place-items-center rounded-sm text-on-dark-muted hover:bg-white/5 hover:text-white"
							aria-label="Expand sidebar"
						>
							<PanelLeftOpen size={16} />
						</button>
					</div>
				) : (
					<div className="flex items-center gap-2 pe-1">
						<button
							type="button"
							onClick={() => orgsAvailable.length > 1 && setOrgMenu((o) => !o)}
							className={cn(
								'flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] p-1.5 text-left',
								orgsAvailable.length > 1 && 'hover:bg-white/5',
							)}
							aria-haspopup={orgsAvailable.length > 1 ? 'menu' : undefined}
							aria-expanded={orgsAvailable.length > 1 ? orgMenu : undefined}
						>
							<LogoMark size={34} />
							<span className="min-w-0 flex-1 leading-tight">
								<b className="block truncate text-sm font-semibold">
									Ledge Desk
								</b>
								<span className="block truncate text-[11px] text-on-dark-muted">
									{org.name}
								</span>
							</span>
							{orgsAvailable.length > 1 ? (
								<ChevronsUpDown
									size={14}
									className="shrink-0 text-on-dark-muted"
									aria-hidden
								/>
							) : null}
						</button>
						<button
							type="button"
							onClick={toggle}
							className="grid size-8 shrink-0 place-items-center rounded-sm text-on-dark-muted hover:bg-white/5 hover:text-white"
							aria-label="Collapse sidebar"
							data-tour="sidebar-collapse"
						>
							<PanelLeftClose size={16} />
						</button>
					</div>
				)}
				{orgMenu ? (
					<OrgSwitcherMenu
						onDone={() => setOrgMenu(false)}
						className="absolute inset-x-1 top-full z-20 mt-1"
					/>
				) : null}
			</div>

			<NavLinks collapsed={collapsed} flow />
			<div className="mt-2">
				<UserBlock collapsed={collapsed} />
			</div>
		</aside>
	);
}

// ---------- Desktop top bar ----------

function TopBar({ meta }: { meta: PageMeta }) {
	const user = useAuthStore((s) => s.user)!;
	const openPalette = usePaletteStore((s) => s.setOpen);
	return (
		<header className="hidden h-topbar shrink-0 items-center gap-6 border-b border-border bg-white px-6 lg:flex">
			<div className="min-w-0">
				<h1 className="truncate text-lg font-semibold">{meta.title}</h1>
				{meta.subtitle ? (
					<p className="truncate text-xs text-t2">{meta.subtitle}</p>
				) : null}
			</div>
			<button
				type="button"
				onClick={() => openPalette(true)}
				className="mx-auto flex h-9 w-full max-w-[480px] items-center gap-2 rounded-full bg-muted px-3.5 text-[13px] text-t3 hover:bg-[#e6eaee]"
				aria-label="Search (Command K)"
				data-tour="search"
			>
				<Search size={15} aria-hidden />
				<span className="flex-1 text-left">
					Search tickets, clients, devices…
				</span>
				<span className="kbd">⌘K</span>
			</button>
			<div className="ml-auto flex items-center gap-4 text-t2">
				<span data-tour="bell" className="flex">
					<BellPopover />
				</span>
				<HelpMenu />
				<button
					type="button"
					className="hover:text-t1"
					aria-label="Refresh"
					onClick={() => window.location.reload()}
				>
					<RefreshCw size={18} />
				</button>
				<Link
					to="/$org/me"
					params={{ org: useAuthStore.getState().org!.slug }}
					search={{}}
					aria-label="My account"
				>
					<Avatar name={user.name} src={user.avatarUrl} />
				</Link>
			</div>
		</header>
	);
}

function HelpMenu({ light, onDone }: { light?: boolean; onDone?: () => void }) {
	const openChoice = useTourStore((s) => s.openChoice);
	const startVideo = useTourStore((s) => s.startVideo);
	const startInteractive = useTourStore((s) => s.startInteractive);
	const maxStep = useTourStore((s) => s.maxStep);
	const completedAt = useTourStore((s) => s.completedAt);
	const openPalette = usePaletteStore((s) => s.setOpen);
	const org = useAuthStore((s) => s.org)!;
	const navigate = useNavigate();
	const wrap = (fn: () => void) => () => {
		onDone?.();
		fn();
	};
	return (
		<Menu
			align="end"
			width="w-64"
			header="Help & learning"
			trigger={({ toggle, buttonProps }) => (
				<button
					type="button"
					onClick={toggle}
					className={cn(
						'flex items-center gap-2 rounded-sm',
						light
							? 'w-full px-3.5 py-[11px] text-sm text-[#e6eef1] hover:bg-white/5'
							: 'hover:text-t1',
					)}
					aria-label="Help"
					data-tour="help"
					{...buttonProps}
				>
					<HelpCircle size={18} strokeWidth={light ? 1.7 : 2} />
					{light ? <span>Help &amp; app tour</span> : null}
				</button>
			)}
			items={[
				{
					key: 'tour',
					label: completedAt
						? 'Replay the clickable tour'
						: maxStep > 0
							? `Resume the tour (step ${maxStep + 1})`
							: 'Take the clickable tour',
					icon: <MousePointerClick size={14} />,
					onSelect: wrap(() => startInteractive(completedAt ? 0 : maxStep)),
				},
				{
					key: 'video',
					label: 'Watch the opening video',
					icon: <PlayCircle size={14} />,
					onSelect: wrap(startVideo),
				},
				{
					key: 'choose',
					label: 'Choose how to learn…',
					icon: <HelpCircle size={14} />,
					onSelect: wrap(openChoice),
				},
				{
					key: 'kb',
					label: 'Knowledge base',
					icon: <BookOpen size={14} />,
					onSelect: wrap(() =>
						navigate({ to: '/$org/kb', params: { org: org.slug }, search: {} }),
					),
				},
				{
					key: 'keys',
					label: 'Keyboard shortcuts',
					icon: <Keyboard size={14} />,
					hint: '⌘K',
					onSelect: wrap(() => openPalette(true)),
				},
			]}
		/>
	);
}

// ---------- Mobile ----------

function MobileAppBar({
	onMenu,
	title,
}: {
	onMenu: () => void;
	title: string;
}) {
	const org = useAuthStore((s) => s.org)!;
	const user = useAuthStore((s) => s.user)!;
	const openPalette = usePaletteStore((s) => s.setOpen);
	return (
		<div className="flex h-11 items-center gap-2 bg-brand-950 px-2 pt-[env(safe-area-inset-top)] text-white">
			<button
				type="button"
				onClick={onMenu}
				className="grid size-10 place-items-center rounded-full hover:bg-white/10"
				aria-label="Open menu"
				data-tour="menu"
			>
				<MenuIcon size={22} />
			</button>
			<span className="min-w-0 flex-1 truncate text-[13px]">
				<b className="font-semibold">Ledge Desk</b>{' '}
				<span className="text-on-dark-muted">· {org.name}</span>
				<span className="sr-only"> · {title}</span>
			</span>
			<button
				type="button"
				onClick={() => openPalette(true)}
				className="grid size-10 place-items-center rounded-full hover:bg-white/10"
				aria-label="Search"
			>
				<Search size={19} />
			</button>
			<Link
				to="/$org/me"
				params={{ org: org.slug }}
				search={{}}
				aria-label="My account"
				className="me-1"
			>
				<Avatar name={user.name} tint="dark" size="md" src={user.avatarUrl} />
			</Link>
		</div>
	);
}

function MobileDrawer({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
	const org = useAuthStore((s) => s.org)!;
	const orgsAvailable = useAuthStore((s) => s.availableOrgs);
	const switchOrg = useAuthStore((s) => s.switchOrg);
	const navigate = useNavigate();
	const { mounted, shown } = useOverlayTransition(open);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
		document.addEventListener('keydown', onKey);
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = prev;
		};
	}, [open, onClose]);

	if (!mounted) return null;
	return (
		<div
			className={cn('fixed inset-0 z-50 lg:hidden', !shown && 'pointer-events-none')}
			role="dialog"
			aria-modal="true"
			aria-label="Menu"
		>
			<div
				className={cn(
					'absolute inset-0 bg-[rgba(27,42,50,.5)] transition-opacity duration-200 ease-out',
					shown ? 'opacity-100' : 'opacity-0',
				)}
				onClick={onClose}
				aria-hidden
			/>
			<aside
				className={cn(
					'absolute inset-y-0 left-0 flex w-[290px] max-w-[85vw] flex-col bg-[linear-gradient(180deg,var(--color-brand-900),var(--color-brand-950))] px-3 pt-[calc(12px+env(safe-area-inset-top))] pb-[calc(12px+env(safe-area-inset-bottom))] text-white shadow-pop transition-transform duration-200 ease-out',
					shown ? 'translate-x-0' : '-translate-x-full',
				)}
			>
				<div className="flex items-center gap-2.5 px-1.5 pb-3">
					<LogoMark size={34} />
					<span className="min-w-0 flex-1 leading-tight">
						<b className="block truncate text-sm font-semibold">Ledge Desk</b>
						<span className="block truncate text-[11px] text-on-dark-muted">
							{org.name}
						</span>
					</span>
					<button
						type="button"
						onClick={onClose}
						className="grid size-9 place-items-center rounded-full hover:bg-white/10"
						aria-label="Close menu"
					>
						<X size={20} />
					</button>
				</div>
				<NavLinks onNavigate={onClose} />
				<div className="mt-1 border-t border-white/10 pt-1">
					<HelpMenu light onDone={onClose} />
				</div>
				{orgsAvailable.length > 1 ? (
					<div className="mt-2 border-t border-white/10 pt-2">
						<div className="px-3.5 pt-1 pb-1.5 text-[11px] font-semibold tracking-wider text-on-dark-muted uppercase">
							Organisation
						</div>
						{orgsAvailable.map((o) => (
							<button
								key={o.id}
								type="button"
								onClick={() => {
									switchOrg(o.id);
									onClose();
									navigate({
										to: '/$org/dashboard',
										params: { org: o.slug },
										search: {},
									});
								}}
								className={cn(
									'flex w-full items-center gap-2 rounded-[10px] px-3.5 py-2 text-left text-[13px] hover:bg-white/5',
									o.id === org.id && 'font-semibold',
								)}
							>
								<span className="flex-1 truncate">{o.name}</span>
								{o.id === org.id ? (
									<Check size={14} aria-label="current" />
								) : null}
							</button>
						))}
					</div>
				) : null}
				<div className="mt-2">
					<UserBlock onDone={onClose} />
				</div>
			</aside>
		</div>
	);
}

function MobileTabBar({ orgSlug }: { orgSlug: string }) {
	const unread = useUnread();
	return (
		<nav
			className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom))] justify-around border-t border-border bg-white px-2 pt-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
			aria-label="Primary"
			data-tour="tabbar"
		>
			{mobileTabs.map((t) => (
				<Link
					key={t.to}
					to={`/$org/${t.to}` as '/$org/dashboard'}
					params={{ org: orgSlug }}
					search={{}}
					className="relative flex w-16 flex-col items-center gap-1 text-[11px] text-t2"
					activeProps={{ className: 'font-semibold text-brand-900' }}
				>
					{({ isActive }) => (
						<>
							<t.icon
								size={22}
								strokeWidth={isActive ? 2.2 : 1.7}
								aria-hidden
							/>
							{t.badge && unread ? (
								<span className="absolute -top-1 right-3 rounded-full bg-danger px-1.5 text-[9px] font-bold text-white">
									{unread}
								</span>
							) : null}
							{t.label}
						</>
					)}
				</Link>
			))}
		</nav>
	);
}

/** Dark mobile header block, as in the mobile designs. */
export function MobileHeader({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn('bg-brand-900 px-4 pt-3 pb-4 text-white', className)}>
			{children}
		</div>
	);
}
