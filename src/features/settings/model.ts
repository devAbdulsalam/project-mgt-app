export interface SettingsGroup {
	group: string;
	items: readonly (readonly [string, string])[];
}

export const settingsSections: readonly SettingsGroup[] = [
	{ group: 'Workspace', items: [['general', 'General'], ['branding', 'Branding'], ['team', 'Team & roles'], ['billing', 'Billing & plan'], ['security', 'Security & SSO'], ['audit', 'Audit log']] },
	{ group: 'Service desk', items: [['channels', 'Channels (WhatsApp, email)'], ['sla', 'SLA policies'], ['ticket-types', 'Ticket types & categories'], ['business-hours', 'Business hours'], ['automation', 'Automation'], ['csat', 'CSAT surveys']] },
	{ group: 'Clients', items: [['plans', 'Contract plans'], ['invoicing', 'Invoicing & tax'], ['portal', 'Client portal']] },
	{ group: 'Data', items: [['integrations', 'Integrations'], ['api', 'API keys & webhooks'], ['export', 'Export / NDPR requests']] },
];
export type SettingsSection = 'general' | 'branding' | 'team' | 'billing' | 'security' | 'audit' | 'channels' | 'sla' | 'ticket-types' | 'business-hours' | 'automation' | 'csat' | 'plans' | 'invoicing' | 'portal' | 'integrations' | 'api' | 'export';
export const sectionTitle = (s: string) => settingsSections.flatMap((g) => g.items).find(([k]) => k === s)?.[1] ?? 'Settings';
