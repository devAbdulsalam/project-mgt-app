// Mock data for the Ledge Desk front-end. Replace with API calls when the backend lands.

export type Role = 'Super Admin' | 'Admin' | 'Operations Lead' | 'Support agent' | 'Field engineer' | 'Viewer';

export interface User {
	id: string;
	name: string;
	email: string;
	role: Role;
	avatarTint?: 'teal' | 'tan' | 'green' | 'lavender' | 'grey';
}

export interface Org {
	id: string;
	slug: string;
	name: string;
	industry: string;
	timezone: string;
	timezoneLabel: string;
	currency: string;
	cities: string[];
	trialDaysLeft: number;
	setupStepsDone: number;
	setupStepsTotal: number;
	invitesAccepted: number;
	invitesSent: number;
}

export const orgs: Org[] = [
	{
		id: 'org_kolanut',
		slug: 'kolanut',
		name: 'Kolanut Systems Ltd',
		industry: 'Managed IT & software support',
		timezone: 'Africa/Lagos',
		timezoneLabel: 'West Africa Time',
		currency: 'NGN',
		cities: ['Lagos', 'Abuja', 'Port Harcourt'],
		trialDaysLeft: 12,
		setupStepsDone: 2,
		setupStepsTotal: 5,
		invitesAccepted: 3,
		invitesSent: 4,
	},
	{
		id: 'org_alrashidi',
		slug: 'alrashidi',
		name: 'Al-Rashidi Industrial Group',
		industry: 'Industrial equipment support',
		timezone: 'Asia/Dubai',
		timezoneLabel: 'Gulf Standard Time',
		currency: 'AED',
		cities: ['Dubai', 'Abu Dhabi'],
		trialDaysLeft: 0,
		setupStepsDone: 5,
		setupStepsTotal: 5,
		invitesAccepted: 12,
		invitesSent: 12,
	},
];

export const users: User[] = [
	{ id: 'u_adaeze', name: 'Adaeze Okonkwo', email: 'adaeze@kolanutsystems.ng', role: 'Operations Lead', avatarTint: 'teal' },
	{ id: 'u_amr', name: 'Amr Hassan', email: 'amr.hassan@alrashidi.ae', role: 'Super Admin', avatarTint: 'teal' },
	{ id: 'u_chinedu', name: 'Chinedu Eze', email: 'chinedu.eze@kolanutsystems.ng', role: 'Field engineer', avatarTint: 'teal' },
];

/** Demo credentials accepted by the mock auth layer. */
export const demoAccounts: { email: string; password: string; userId: string; orgId: string; phone: string }[] = [
	{ email: 'adaeze@kolanutsystems.ng', password: 'password', userId: 'u_adaeze', orgId: 'org_kolanut', phone: '+234 803 555 0142' },
	{ email: 'amr.hassan@alrashidi.ae', password: 'password', userId: 'u_amr', orgId: 'org_alrashidi', phone: '+971 50 555 0912' },
	{ email: 'chinedu.eze@kolanutsystems.ng', password: 'password', userId: 'u_chinedu', orgId: 'org_kolanut', phone: '+234 803 555 0912' },
];

export const DEMO_OTP = '482913';

// ---------- Dashboard ----------

export type Trend = { direction: 'up' | 'down' | 'flat'; label: string; good: boolean };

export interface Kpi {
	id: string;
	label: string;
	value: string;
	suffix?: string;
	icon: 'ticket' | 'clock' | 'shield' | 'smile';
	tint: 'teal' | 'blue' | 'green' | 'yellow';
	trend?: Trend;
	note?: string;
}

export const kpis: Kpi[] = [
	{ id: 'open', label: 'Open tickets', value: '164', icon: 'ticket', tint: 'teal', trend: { direction: 'up', label: '+9% vs last week', good: false } },
	{ id: 'frt', label: 'First response', value: '24 min', icon: 'clock', tint: 'blue', trend: { direction: 'down', label: '-11 min vs last week', good: true } },
	{ id: 'sla', label: 'SLA compliance', value: '91.6%', icon: 'shield', tint: 'green', trend: { direction: 'up', label: '+2.3% vs last week', good: true } },
	{ id: 'csat', label: 'CSAT', value: '4.6', suffix: '/5', icon: 'smile', tint: 'yellow', note: '128 ratings this week' },
];

export type Channel = 'whatsapp' | 'email' | 'phone' | 'portal';

export const channelMeta: Record<Channel, { label: string; color: string }> = {
	whatsapp: { label: 'WhatsApp', color: '#22a05b' },
	email: { label: 'Email', color: '#2b5aa0' },
	phone: { label: 'Phone', color: '#e0a100' },
	portal: { label: 'Portal', color: '#6b3fa0' },
};

export const ticketsByChannel: Array<{ day: string } & Record<Channel, number>> = [
	{ day: 'Thu 4', whatsapp: 30, email: 13, phone: 7, portal: 4 },
	{ day: 'Fri 5', whatsapp: 33, email: 12, phone: 7, portal: 3 },
	{ day: 'Sat 6', whatsapp: 27, email: 13, phone: 6, portal: 3 },
	{ day: 'Mon 8', whatsapp: 36, email: 14, phone: 6, portal: 2 },
	{ day: 'Tue 9', whatsapp: 32, email: 14, phone: 6, portal: 2 },
	{ day: 'Wed 10', whatsapp: 12, email: 5, phone: 3, portal: 0 },
	{ day: 'Thu 11', whatsapp: 8, email: 3, phone: 0, portal: 0 },
];

export const channelShare: Array<{ channel: Channel; pct: number }> = [
	{ channel: 'whatsapp', pct: 58 },
	{ channel: 'email', pct: 24 },
	{ channel: 'phone', pct: 12 },
	{ channel: 'portal', pct: 6 },
];

export const slaSummary = {
	metPct: 91.6,
	breakdown: [
		{ key: 'met', label: 'Met', pct: 83, color: '#22a05b' },
		{ key: 'risk', label: 'At risk', pct: 9, color: '#e0a100' },
		{ key: 'breached', label: 'Breached', pct: 8, color: '#d93f3f' },
	],
	byPriority: [
		{ label: 'P1 · Critical (1h / 4h)', pct: 96 },
		{ label: 'P2 · High (2h / 8h)', pct: 92 },
		{ label: 'P3 · Normal (4h / 2d)', pct: 86 },
	],
};

export interface Client {
	id: string;
	name: string;
	industry: string;
	tier: 'Gold retainer' | 'Gold' | 'Silver' | 'Bronze';
	openTickets: number;
	healthPct: number;
}

export const topClients: Client[] = [
	{ id: 'c1', name: 'Lekki Fintech Ltd', industry: 'Fintech', tier: 'Gold retainer', openTickets: 31, healthPct: 94 },
	{ id: 'c2', name: 'Abuja Health Cooperative', industry: 'Healthcare', tier: 'Silver', openTickets: 24, healthPct: 88 },
	{ id: 'c3', name: 'Port Harcourt Logistics Co.', industry: 'Logistics', tier: 'Gold', openTickets: 19, healthPct: 97 },
	{ id: 'c4', name: 'Kano Textiles Plc', industry: 'Manufacturing', tier: 'Bronze', openTickets: 14, healthPct: 76 },
	{ id: 'c5', name: 'Ibadan University Press', industry: 'Education', tier: 'Silver', openTickets: 11, healthPct: 91 },
];

export const totalClients = 42;

export type EngineerStatus = 'On site' | 'En route' | 'Remote' | 'Available' | 'Break';

export interface Engineer {
	id: string;
	name: string;
	detail: string;
	status: EngineerStatus;
	tint: 'teal' | 'tan' | 'green' | 'lavender' | 'grey';
}

export const engineers: Engineer[] = [
	{ id: 'e1', name: 'Chinedu Eze', detail: 'On site · Lekki Fintech · KS-2041', status: 'On site', tint: 'teal' },
	{ id: 'e2', name: 'Amina Yusuf', detail: 'En route · Abuja Health · KS-2038', status: 'En route', tint: 'tan' },
	{ id: 'e3', name: 'Emeka Nwosu', detail: 'Remote session · Kano Textiles', status: 'Remote', tint: 'green' },
	{ id: 'e4', name: 'Funke Adeyemi', detail: 'Ikeja office', status: 'Available', tint: 'lavender' },
	{ id: 'e5', name: 'Ibrahim Musa', detail: 'Port Harcourt · back 14:00', status: 'Break', tint: 'grey' },
];

export const trafficAlert = 'Traffic alert: Third Mainland Bridge · Lekki ETA +45 min';

import type { Priority, Status as TicketStatus, TicketType } from './types';
export type { Priority, TicketStatus, TicketType };

export interface Ticket {
	key: string;
	title: string;
	type: TicketType;
	priority: Priority;
	status: TicketStatus;
	client: string;
	assignee?: string;
	slaRemaining?: string;
	slaBreachRisk?: boolean;
	note?: string;
	updatedAgo: string;
}

export const needsAttention: Ticket[] = [
	{ key: 'KS-2044', title: 'Ransomware alert on file server', type: 'bug', priority: 'P1', status: 'In progress', client: 'Kano Textiles', assignee: 'Emeka Nwosu', slaRemaining: '0h 38m', slaBreachRisk: true, updatedAgo: '6m' },
	{ key: 'KS-2043', title: 'POS terminals offline at Ikeja branch', type: 'support', priority: 'P1', status: 'Dispatched', client: 'Lekki Fintech', assignee: 'Chinedu Eze', slaRemaining: '1h 05m', slaBreachRisk: true, updatedAgo: '14m' },
	{ key: 'KS-2039', title: 'UPS not switching on grid outage', type: 'support', priority: 'P2', status: 'Open', client: 'Abuja Health', note: 'unassigned', updatedAgo: '1h' },
	{ key: 'KS-2031', title: 'Payroll app timeout at month-end', type: 'task', priority: 'P2', status: 'Waiting on client', client: 'Ibadan Univ. Press', assignee: 'Funke Adeyemi', note: 'customer waiting 2d', updatedAgo: '2d' },
];

export const mobileKpis = [
	{ id: 'assigned', label: 'Assigned', value: '7', icon: 'alert' as const, color: '#f5c542' },
	{ id: 'risk', label: 'SLA at risk', value: '2', icon: 'timer' as const, color: '#ff8a8a' },
	{ id: 'sprint', label: 'Sprint 24', value: '56%', icon: 'target' as const, color: '#8fd3b5' },
];

export const todaySchedule = [
	{ time: '09:30', title: 'Server room UPS inspection', sub: 'KS-2039 · Abuja Health, Wuse 2', color: '#22a05b' },
	{ time: '14:00', title: 'POS network re-cabling', sub: 'KS-2043 · Lekki Fintech, Ikeja branch', color: '#e0a100' },
];

// ---------- Onboarding option lists ----------

export const industries = [
	'Managed IT & software support',
	'Software product / SaaS',
	'Industrial equipment support',
	'Telecoms & ISP',
	'Facilities management',
	'Other',
];
export const teamSizes = ['1 – 10', '11 – 50', '51 – 200', '201 – 1000', '1000+'];
export const cities = ['Lagos (Ikeja)', 'Lagos (Lekki)', 'Lagos (Victoria Island)', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan', 'Remote'];
export const inviteRoles: Role[] = ['Admin', 'Support agent', 'Field engineer', 'Viewer'];
export const inviteBases = ['Lagos · Ikeja', 'Lagos · Lekki', 'Abuja', 'Port Harcourt', 'Kano', 'Remote'];

export interface ModuleOption {
	id: string;
	name: string;
	description: string;
	icon: 'ticket' | 'calendar' | 'cpu' | 'board' | 'building' | 'book';
	defaultOn: boolean;
}

export const modules: ModuleOption[] = [
	{ id: 'helpdesk', name: 'Helpdesk & SLAs', description: 'Email, WhatsApp, phone and portal intake', icon: 'ticket', defaultOn: true },
	{ id: 'visits', name: 'Field visits', description: 'Dispatch engineers, route by area', icon: 'calendar', defaultOn: true },
	{ id: 'assets', name: 'Assets & devices', description: 'Laptops, servers, routers, UPS, licences', icon: 'cpu', defaultOn: true },
	{ id: 'projects', name: 'Projects & sprints', description: 'For software delivery teams', icon: 'board', defaultOn: false },
	{ id: 'contracts', name: 'Client contracts', description: 'Retainers, hours banks, naira invoicing', icon: 'building', defaultOn: true },
	{ id: 'kb', name: 'Knowledge base', description: 'Public and internal articles', icon: 'book', defaultOn: false },
];

export interface Plan {
	id: string;
	name: string;
	price: string;
	per?: string;
	blurb: string;
	popular?: boolean;
}

export const plans: Plan[] = [
	{ id: 'starter', name: 'Starter', price: '₦18,000', per: '/agent/mo', blurb: 'Helpdesk, portal, 2 channels' },
	{ id: 'growth', name: 'Growth', price: '₦32,000', per: '/agent/mo', blurb: '+ Field visits, assets, WhatsApp, SLAs', popular: true },
	{ id: 'enterprise', name: 'Enterprise', price: 'Custom', blurb: 'SSO, audit log, dedicated support' },
];
