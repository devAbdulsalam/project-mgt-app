import type { TicketSearch } from '@/features/tickets/model/filters';
import { allPriorities } from '@/mocks/seed';
import type { Priority } from '@/mocks/types';

/**
 * Parse a JQL-ish query like `status:open assignee:me priority>=high vpn` into typed ticket search params.
 * Returns the structured filters plus the leftover free text.
 */
export function parseQuery(input: string): { search: Partial<TicketSearch>; text: string; structured: boolean } {
	const search: Partial<TicketSearch> = {};
	const rest: string[] = [];
	let structured = false;
	for (const tok of input.trim().split(/\s+/).filter(Boolean)) {
		const m = tok.match(/^(status|assignee|priority|channel|type|client)(>=|<=|:|=)(.+)$/i);
		if (!m) {
			rest.push(tok);
			continue;
		}
		structured = true;
		const [, field, op, raw] = m;
		const v = raw!.toLowerCase();
		switch (field!.toLowerCase()) {
			case 'status':
				search.tab = v === 'open' ? 'open' : v === 'resolved' || v === 'closed' || v === 'done' ? 'resolved' : v === 'waiting' ? 'waiting' : v === 'all' ? 'all' : 'open';
				break;
			case 'assignee':
				search.assignee = v === 'me' ? 'me' : v === 'none' || v === 'unassigned' ? 'unassigned' : v;
				if (v === 'me') search.tab = search.tab ?? 'open';
				break;
			case 'priority': {
				const map: Record<string, Priority> = { critical: 'P1', high: 'P2', medium: 'P3', normal: 'P3', low: 'P4', p1: 'P1', p2: 'P2', p3: 'P3', p4: 'P4' };
				const p = map[v];
				if (!p) break;
				const idx = allPriorities.indexOf(p);
				search.priority = op === '>=' ? allPriorities.slice(0, idx + 1) : op === '<=' ? allPriorities.slice(idx) : [p];
				break;
			}
			case 'channel':
				if (['whatsapp', 'email', 'phone', 'portal', 'internal'].includes(v)) search.channel = [v as never];
				break;
			case 'type':
				if (['task', 'bug', 'story', 'epic', 'subtask', 'support'].includes(v)) search.type = [v as never];
				break;
		}
	}
	return { search, text: rest.join(' '), structured };
}
