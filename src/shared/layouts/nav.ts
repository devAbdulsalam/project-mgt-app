import type { LucideIcon } from 'lucide-react';
import { LayoutGrid, Inbox, Ticket, Folder, Columns3, Building2, Cpu, CalendarDays, BarChart3, Bell, Users, Settings, BookOpen, Home, User, GraduationCap, Receipt } from 'lucide-react';

export interface NavItem {
	to: string; // relative to /$org
	label: string;
	icon: LucideIcon;
	badge?: number;
}

export const sidebarNav: NavItem[] = [
	{ to: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
	{ to: 'inbox', label: 'My Work', icon: Inbox },
	{ to: 'tickets', label: 'Tickets', icon: Ticket },
	{ to: 'projects', label: 'Projects', icon: Folder },
	{ to: 'boards', label: 'Boards', icon: Columns3 },
	{ to: 'customers', label: 'Clients', icon: Building2 },
	{ to: 'assets', label: 'Assets', icon: Cpu },
	{ to: 'visits', label: 'Visits', icon: CalendarDays },
	{ to: 'programs', label: 'Programmes', icon: GraduationCap },
	{ to: 'expenses', label: 'Expenses', icon: Receipt },
	{ to: 'kb', label: 'Knowledge base', icon: BookOpen },
	{ to: 'reports', label: 'Reports', icon: BarChart3 },
	{ to: 'notifications', label: 'Notifications', icon: Bell, badge: 1 },
	{ to: 'users', label: 'Team', icon: Users },
	{ to: 'settings', label: 'Settings', icon: Settings },
];

export const mobileTabs: NavItem[] = [
	{ to: 'dashboard', label: 'Home', icon: Home },
	{ to: 'tickets', label: 'Tickets', icon: Ticket },
	{ to: 'boards', label: 'Boards', icon: Columns3 },
	{ to: 'notifications', label: 'Inbox', icon: Bell, badge: 1 },
	{ to: 'me', label: 'Profile', icon: User },
];
