import { Mail, MessageSquare, Phone, LayoutGrid, Wrench, Bug, CheckSquare, Bookmark, Zap, CornerDownRight, LifeBuoy } from 'lucide-react';
import type { Channel, Priority, Status, TicketType } from '@/mocks/types';
import type { PillTone } from './Pill';

export const statusTone: Record<Status, PillTone> = {
	New: 'new',
	Open: 'open',
	'In progress': 'progress',
	Dispatched: 'teal',
	Scheduled: 'closed',
	'Waiting on client': 'pending',
	'Awaiting vendor': 'review',
	'In review': 'review',
	Blocked: 'blocked',
	Resolved: 'done',
	Closed: 'closed',
};

export const priorityTone: Record<Priority, PillTone> = { P1: 'critical', P2: 'high', P3: 'medium', P4: 'low' };
export const priorityLabel: Record<Priority, string> = { P1: 'Critical', P2: 'High', P3: 'Medium', P4: 'Low' };

export const channelMeta: Record<Channel, { label: string; icon: typeof Mail; color: string }> = {
	whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'text-success-fg' },
	email: { label: 'Email', icon: Mail, color: 'text-info-fg' },
	phone: { label: 'Phone', icon: Phone, color: 'text-warning-fg' },
	portal: { label: 'Portal', icon: LayoutGrid, color: 'text-purple-fg' },
	internal: { label: 'Internal', icon: Wrench, color: 'text-t2' },
};

export const typeMeta: Record<TicketType, { label: string; color: string; icon: typeof Bug }> = {
	task: { label: 'Task', color: 'bg-info', icon: CheckSquare },
	bug: { label: 'Bug', color: 'bg-danger', icon: Bug },
	story: { label: 'Story', color: 'bg-success', icon: Bookmark },
	epic: { label: 'Epic', color: 'bg-purple-fg', icon: Zap },
	subtask: { label: 'Sub-task', color: 'bg-brand-600', icon: CornerDownRight },
	support: { label: 'Support request', color: 'bg-warning', icon: LifeBuoy },
};
