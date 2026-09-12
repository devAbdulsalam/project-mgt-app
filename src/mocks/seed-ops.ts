import { SEED_NOW } from './seed';
import type { Asset, ClientAccount, KbArticle, OrgSettings, Visit } from './types';

const min = (n: number) => SEED_NOW - n * 60_000;
const hr = (n: number) => min(n * 60);
const day = (n: number) => hr(n * 24);
const ahead = (days: number) => SEED_NOW + days * 86_400_000;
const at = (hours: number, minutes = 0) => {
	const d = new Date(SEED_NOW);
	d.setHours(hours, minutes, 0, 0);
	return d.getTime();
};

// ---------------------------------------------------------------------------
// Clients

export const clientAccounts: ClientAccount[] = [
	{
		id: 'c_lekki', name: 'Lekki Fintech Ltd', initials: 'LF', rc: 'RC 1483920', industry: 'Fintech', city: 'Lagos', plan: 'Gold', status: 'Active', healthPct: 94, tint: 'teal',
		siteList: [
			{ id: 's1', name: 'Head office · Lekki Phase 1', address: 'Plot 12 Admiralty Way', contactName: 'Tunde Bakare', assets: 98, open: 8 },
			{ id: 's2', name: 'Ikeja branch', address: '24 Allen Avenue', contactName: 'Bola Adeyinka', assets: 42, open: 6, note: 'P1 open' },
			{ id: 's3', name: 'Victoria Island branch', address: '1004 Estate', contactName: 'Bola Adeyinka', assets: 44, open: 3 },
			{ id: 's4', name: 'Abuja office · Maitama', address: 'Served from Abuja team', contactName: 'Halima Bello', assets: 28, open: 2 },
		],
		contacts: [
			{ id: 'k1', name: 'Tunde Bakare', role: 'Head of Support', primary: true, channel: 'whatsapp', phone: '+234 802 ••• 3391', email: 'tunde@lekkifintech.com' },
			{ id: 'k2', name: 'Bola Adeyinka', role: 'Branch manager, Ikeja', channel: 'phone', phone: '+234 803 ••• 1188' },
			{ id: 'k3', name: 'Chika Obi', role: 'CFO · invoices & approvals', channel: 'email', email: 'cfo@lekkifintech.com' },
		],
		assetsCount: 212, hoursUsed: 14, hoursIncluded: 40, mrr: 2_400_000, renewalAt: ahead(61), since: day(560), accountManagerId: 'u_adaeze', csat: 4.8, csatCount: 22,
		invoices: [
			{ id: 'i1', number: 'INV-0928', label: 'Aug retainer + 4G router', amount: 2_485_000, status: 'Overdue', issuedAt: day(42), dueAt: day(12) },
			{ id: 'i2', number: 'INV-0901', label: 'Jul retainer', amount: 2_400_000, status: 'Paid', issuedAt: day(72), dueAt: day(42) },
			{ id: 'i3', number: 'INV-0874', label: 'Jun retainer', amount: 2_400_000, status: 'Paid', issuedAt: day(102), dueAt: day(72) },
		],
		notes: [{ id: 'n1', authorName: 'Adaeze Okonkwo', body: 'Renewal call booked for 20 Oct. Tunde wants VI branch added to Gold coverage.', at: day(3) }],
		contract: { plan: 'Gold retainer', termStart: day(304), termEnd: ahead(61), feeMonthly: 2_400_000, hoursIncluded: 40, overageRate: 18_000, coverage: 'Mon–Sat 07:00–20:00 · P1 24/7', slaSummary: 'P1 15m / 4h · P2 30m / 8h · P3 2h / 2d', scope: 'Network, M365, POS, endpoint, payments app L2', excluded: 'Hardware parts (quoted), 3rd-party ISP fees', documents: ['MSA.pdf', 'SLA schedule.pdf', 'NDPR DPA.pdf'] },
	},
	{
		id: 'c_abuja', name: 'Abuja Health Cooperative', initials: 'AH', rc: 'RC 902113', industry: 'Healthcare', city: 'Abuja', plan: 'Silver', status: 'Active', healthPct: 88, tint: 'green',
		siteList: [
			{ id: 's1', name: 'Wuse 2 clinic', address: '14 Aminu Kano Crescent', contactName: 'Dr Amaka Obi', assets: 56, open: 5 },
			{ id: 's2', name: 'Garki clinic', address: 'Area 11, Garki', contactName: 'Halima Bello', assets: 28, open: 3 },
			{ id: 's3', name: 'Warehouse · Idu', address: 'Idu Industrial', contactName: 'Halima Bello', assets: 12, open: 0 },
		],
		contacts: [
			{ id: 'k1', name: 'Dr Amaka Obi', role: 'Medical Director', primary: true, channel: 'email', email: 'amaka@abujahealth.coop' },
			{ id: 'k2', name: 'Halima Bello', role: 'Operations', channel: 'whatsapp', phone: '+234 803 ••• 7710' },
		],
		assetsCount: 96, hoursUsed: 16, hoursIncluded: 20, mrr: 1_150_000, renewalAt: ahead(46), since: day(410), accountManagerId: 'u_adaeze', csat: 4.3, csatCount: 18,
		invoices: [
			{ id: 'i1', number: 'INV-0931', label: 'Aug retainer', amount: 1_150_000, status: 'Due', issuedAt: day(12), dueAt: ahead(18) },
			{ id: 'i2', number: 'INV-0902', label: 'Jul retainer', amount: 1_150_000, status: 'Paid', issuedAt: day(42), dueAt: day(12) },
		],
		notes: [],
		contract: { plan: 'Silver', termStart: day(319), termEnd: ahead(46), feeMonthly: 1_150_000, hoursIncluded: 20, overageRate: 20_000, coverage: 'Mon–Fri 08:00–18:00 · P1 extended 07:00–22:00', slaSummary: 'P1 30m / 8h · P2 1h / 1d · P3 4h / 3d', scope: 'Network, UPS, endpoints, EMR support L1', excluded: 'Medical devices, generator servicing', documents: ['MSA.pdf', 'SLA schedule.pdf'] },
	},
	{
		id: 'c_ph', name: 'Port Harcourt Logistics Co.', initials: 'PH', rc: 'RC 771204', industry: 'Logistics', city: 'Port Harcourt', plan: 'Gold', status: 'Active', healthPct: 97, tint: 'teal',
		siteList: [
			{ id: 's1', name: 'Trans Amadi depot', address: 'Trans Amadi Industrial Layout', contactName: 'Obinna Wike', assets: 104, open: 4 },
			{ id: 's2', name: 'Onne port office', address: 'Onne Free Zone', contactName: 'Blessing Okoro', assets: 36, open: 1 },
		],
		contacts: [
			{ id: 'k1', name: 'Blessing Okoro', role: 'IT Manager', primary: true, channel: 'email', email: 'blessing@phlogistics.ng' },
			{ id: 'k2', name: 'Obinna Wike', role: 'Depot supervisor', channel: 'whatsapp', phone: '+234 805 ••• 2204' },
		],
		assetsCount: 140, hoursUsed: 9, hoursIncluded: 40, mrr: 1_900_000, renewalAt: ahead(144), since: day(700), accountManagerId: 'u_ibrahim', csat: 4.7, csatCount: 14,
		invoices: [{ id: 'i1', number: 'INV-0929', label: 'Aug retainer', amount: 1_900_000, status: 'Paid', issuedAt: day(12), dueAt: ahead(18) }],
		notes: [{ id: 'n1', authorName: 'Ibrahim Musa', body: 'Core switch replacement scheduled Sat 13 Sep 22:00. Depot supervisor to confirm access.', at: day(1) }],
		contract: { plan: 'Gold', termStart: day(221), termEnd: ahead(144), feeMonthly: 1_900_000, hoursIncluded: 40, overageRate: 18_000, coverage: 'Mon–Sat 07:00–20:00 · P1 24/7', slaSummary: 'P1 15m / 4h · P2 30m / 8h · P3 2h / 2d', scope: 'Network, Wi-Fi, backups, endpoints', excluded: 'Handheld scanners (vendor)', documents: ['MSA.pdf'] },
	},
	{
		id: 'c_kano', name: 'Kano Textiles Plc', initials: 'KT', rc: 'RC 334871', industry: 'Manufacturing', city: 'Kano', plan: 'Bronze', status: 'Active', healthPct: 76, tint: 'tan',
		siteList: [{ id: 's1', name: 'Bompai factory', address: 'Bompai Industrial Estate', contactName: 'Alhaji Sani Bello', assets: 58, open: 14, note: 'P1 open' }],
		contacts: [{ id: 'k1', name: 'Alhaji Sani Bello', role: 'General Manager', primary: true, channel: 'whatsapp', phone: '+234 806 ••• 9012' }],
		assetsCount: 58, hoursUsed: 12, hoursIncluded: 10, mrr: 450_000, renewalAt: ahead(18), since: day(380), accountManagerId: 'u_emeka', csat: 3.4, csatCount: 11,
		invoices: [{ id: 'i1', number: 'INV-0933', label: 'Aug pay-as-you-go · 12h', amount: 540_000, status: 'Due', issuedAt: day(10), dueAt: ahead(20) }],
		notes: [{ id: 'n1', authorName: 'Emeka Nwosu', body: '3 P1 breaches this month. Recommend Silver at renewal on 30 Sep; GM open to it if response improves.', at: day(2) }],
		contract: { plan: 'Bronze / pay-as-you-go', termStart: day(347), termEnd: ahead(18), feeMonthly: 450_000, hoursIncluded: 10, overageRate: 25_000, coverage: 'Mon–Fri 08:00–18:00', slaSummary: 'P1 1h / 1d · P2–P4 4h / 5d', scope: 'Servers, endpoints, CCTV', excluded: 'Factory OT equipment', documents: ['Terms.pdf'] },
	},
	{
		id: 'c_ibadan', name: 'Ibadan University Press', initials: 'IU', rc: 'RC 118002', industry: 'Education', city: 'Ibadan', plan: 'Silver', status: 'Active', healthPct: 91, tint: 'lavender',
		siteList: [
			{ id: 's1', name: 'Main press · Bodija', address: 'UI Road, Bodija', contactName: 'Prof. Kunle Ajayi', assets: 50, open: 8 },
			{ id: 's2', name: 'Bookshop · Dugbe', address: 'Dugbe Market', contactName: 'Bola Adeyinka', assets: 24, open: 3 },
		],
		contacts: [{ id: 'k1', name: 'Prof. Kunle Ajayi', role: 'Director', primary: true, channel: 'email', email: 'director@iupress.edu.ng' }],
		assetsCount: 74, hoursUsed: 11, hoursIncluded: 20, mrr: 780_000, renewalAt: ahead(125), since: day(300), accountManagerId: 'u_funke', csat: 4.2, csatCount: 7,
		invoices: [{ id: 'i1', number: 'INV-0930', label: 'Aug retainer', amount: 780_000, status: 'Paid', issuedAt: day(12), dueAt: ahead(18) }],
		notes: [],
		contract: { plan: 'Silver', termStart: day(240), termEnd: ahead(125), feeMonthly: 780_000, hoursIncluded: 20, overageRate: 20_000, coverage: 'Mon–Fri 08:00–18:00', slaSummary: 'P1 30m / 8h · P2 1h / 1d · P3 4h / 3d', scope: 'Payroll app L2, M365, printers', excluded: 'Press machinery', documents: ['MSA.pdf'] },
	},
	{
		id: 'c_surulere', name: 'Surulere Microfinance Bank', initials: 'SM', rc: 'RC 655310', industry: 'Banking', city: 'Lagos', plan: 'Gold', status: 'Active', healthPct: 95, tint: 'tan',
		siteList: [
			{ id: 's1', name: 'Head office · Surulere', address: '5 Bode Thomas Street', contactName: 'Chioma Nnamdi', assets: 80, open: 4 },
			{ id: 's2', name: 'Ojuelegba branch', address: 'Ojuelegba Road', contactName: 'Chioma Nnamdi', assets: 36, open: 2 },
			{ id: 's3', name: 'Yaba branch', address: 'Herbert Macaulay Way', contactName: 'Chioma Nnamdi', assets: 34, open: 1 },
		],
		contacts: [{ id: 'k1', name: 'Chioma Nnamdi', role: 'Head of IT', primary: true, channel: 'whatsapp', phone: '+234 809 ••• 6644' }],
		assetsCount: 188, hoursUsed: 19, hoursIncluded: 40, mrr: 2_100_000, renewalAt: ahead(99), since: day(450), accountManagerId: 'u_chinedu', csat: 4.7, csatCount: 9,
		invoices: [{ id: 'i1', number: 'INV-0927', label: 'Aug retainer', amount: 2_100_000, status: 'Paid', issuedAt: day(12), dueAt: ahead(18) }],
		notes: [],
		contract: { plan: 'Gold', termStart: day(266), termEnd: ahead(99), feeMonthly: 2_100_000, hoursIncluded: 40, overageRate: 18_000, coverage: 'Mon–Sat 07:00–20:00 · P1 24/7', slaSummary: 'P1 15m / 4h · P2 30m / 8h · P3 2h / 2d', scope: 'Core banking app L1, network, endpoints', excluded: 'ATM hardware', documents: ['MSA.pdf', 'SLA schedule.pdf'] },
	},
	{
		id: 'c_enugu', name: 'Enugu Oil Services Ltd', initials: 'EO', rc: 'RC 209944', industry: 'Energy', city: 'Enugu', plan: 'Trial', status: 'Trial', tint: 'grey',
		siteList: [{ id: 's1', name: 'Enugu office', address: 'Independence Layout', contactName: 'Ifeanyi Ude', assets: 22, open: 3 }],
		contacts: [{ id: 'k1', name: 'Ifeanyi Ude', role: 'Admin Manager', primary: true, channel: 'phone', phone: '+234 810 ••• 4400' }],
		assetsCount: 22, hoursUsed: 0, hoursIncluded: 0, mrr: 0, renewalAt: ahead(12), since: day(2), accountManagerId: 'u_ngozi',
		invoices: [],
		notes: [{ id: 'n1', authorName: 'Ngozi Okafor', body: 'Trial started 10 Sep. Interested in Silver for 2 sites.', at: day(2) }],
		contract: { plan: 'Trial', termStart: day(2), termEnd: ahead(12), feeMonthly: 0, hoursIncluded: 0, overageRate: 25_000, coverage: 'Mon–Fri 08:00–18:00', slaSummary: 'Best effort', scope: 'Assessment', excluded: '—', documents: [] },
	},
];

// ---------------------------------------------------------------------------
// Assets

export const assets: Asset[] = [
	{ tag: 'LF-NET-0012', name: 'Mikrotik RB4011 router', detail: 'SN 8C1A-3F20 · Network', serial: '8C1A-3F20-991', category: 'network', clientId: 'c_lekki', site: 'Ikeja branch', location: 'Comms room, rack 1', status: 'Down', agent: 'n/a', warrantyAt: ahead(195), openTicketKey: 'KS-2043', firmware: 'RouterOS 7.14', firmwareAvailable: '7.16', wan: 'FibreOne 100 Mbps · 4G failover (new)', purchased: 'Mar 2024 · ₦420,000 · Kolanut supplied', monitoring: 'Ping + SNMP · last seen 07:41', history: [{ at: hr(2), text: 'Down since 07:41 · KS-2043 · Chinedu on site' }, { at: day(50), text: 'Fibre outage · KS-1988 · resolved 2h 10m' }, { at: day(110), text: 'Firmware 7.14 · scheduled maintenance' }, { at: day(900), text: 'Installed by Ibrahim Musa' }] },
	{ tag: 'LF-POS-0041', name: 'PAX A920 POS terminal', detail: 'SN 0821-44A · ×6 grouped', serial: '0821-44A', category: 'pos', clientId: 'c_lekki', site: 'Ikeja branch', location: 'Tills 1–6', status: 'Degraded', agent: 'n/a', warrantyAt: ahead(105), openTicketKey: 'KS-2043', purchased: 'Jan 2025 · ₦1,150,000', monitoring: 'Via payments app heartbeat', history: [{ at: hr(2), text: 'On hotspot since 08:12 · KS-2043' }, { at: day(240), text: 'Installed · 6 units' }] },
	{ tag: 'LF-SRV-0003', name: 'Dell PowerEdge R650', detail: 'Windows Server 2022 · AD/DC', serial: 'DPE-650-2231', category: 'server', clientId: 'c_lekki', site: 'Head office', location: 'Server room', status: 'Healthy', agent: 'Online', warrantyAt: ahead(46), firmware: 'iDRAC 7.10', purchased: 'Oct 2023 · ₦3,900,000', monitoring: 'Agent · last seen 1 min ago', history: [{ at: day(20), text: 'Windows updates · maintenance window' }, { at: day(1050), text: 'Installed by Chinedu Eze' }] },
	{ tag: 'LF-LAP-0188', name: 'Dell Latitude 5540', detail: 'i7 · 16GB · Win 11 Pro', serial: 'DL5540-0188', category: 'endpoint', clientId: 'c_lekki', site: 'Head office', user: 'Tunde Bakare', status: 'Healthy', agent: 'Online', warrantyAt: ahead(290), purchased: 'Jun 2024 · ₦1,250,000', monitoring: 'Agent · last seen 4 min ago', history: [{ at: day(90), text: 'Battery replaced under warranty' }] },
	{ tag: 'LF-UPS-0007', name: 'APC Smart-UPS 3kVA', detail: 'Battery replaced Jan 2026', serial: 'AS3K-0007', category: 'power', clientId: 'c_lekki', site: 'Ikeja branch', location: 'Comms room', status: 'Degraded', statusDetail: 'Battery 62%', agent: 'SNMP', warrantyAt: ahead(130), monitoring: 'SNMP · battery 62%', history: [{ at: day(240), text: 'Battery pack replaced' }] },
	{ tag: 'LF-LIC-0021', name: 'Microsoft 365 Business Std', detail: '88 seats · annual', serial: 'M365-BS-88', category: 'licence', clientId: 'c_lekki', site: 'All sites', user: 'Tenant lekkifintech.com', status: 'Expiring', agent: '—', warrantyAt: ahead(18), openTicketKey: 'KS-2027', history: [{ at: day(347), text: 'Renewed · 88 seats' }] },
	{ tag: 'LF-LAP-0203', name: 'HP ProBook 450 G10', detail: 'i5 · 8GB · Win 11 Pro', serial: 'HP450-0203', category: 'endpoint', clientId: 'c_lekki', site: 'VI branch', user: 'Unassigned · spare', status: 'In stock', agent: 'Offline 9d', warrantyAt: ahead(345), history: [{ at: day(9), text: 'Returned to stock' }] },
	{ tag: 'LF-NET-0004', name: 'Ubiquiti UniFi AP U6-Pro ×4', detail: 'Wi-Fi · controller-managed', serial: 'U6P-0004', category: 'network', clientId: 'c_lekki', site: 'Head office', location: 'Floors 1–3', status: 'Healthy', agent: 'Online', warrantyAt: ahead(520), firmware: '6.6.55', history: [{ at: day(30), text: 'Controller upgraded to 8.4' }] },
	{ tag: 'AH-NET-0007', name: 'FortiGate 60F', detail: 'FortiOS 7.4 · VPN gateway', serial: 'FGT60F-0007', category: 'network', clientId: 'c_abuja', site: 'Wuse 2 clinic', location: 'Server cabinet', status: 'Degraded', agent: 'SNMP', warrantyAt: ahead(400), openTicketKey: 'KS-2038', firmware: 'FortiOS 7.4.3', firmwareAvailable: '7.4.5', wan: 'MTN 4G · Airtel fibre', history: [{ at: day(1), text: 'VPN drops on MTN · KS-2038' }] },
	{ tag: 'AH-UPS-0002', name: 'APC Smart-UPS 3000', detail: 'Server room · 3kVA', serial: 'AS3K-0002', category: 'power', clientId: 'c_abuja', site: 'Wuse 2 clinic', location: 'Server room', status: 'Down', statusDetail: 'Not switching over', agent: 'n/a', warrantyAt: day(120), openTicketKey: 'KS-2039', history: [{ at: hr(3), text: 'Dropped load on grid outage · KS-2039' }, { at: day(700), text: 'Last serviced' }] },
	{ tag: 'PH-SRV-0001', name: 'HPE ProLiant DL380', detail: 'SQL Server 2019 · WMS', serial: 'DL380-0001', category: 'server', clientId: 'c_ph', site: 'Trans Amadi depot', location: 'Server room', status: 'Degraded', statusDetail: 'Backups failing', agent: 'Online', warrantyAt: ahead(80), openTicketKey: 'KS-2008', history: [{ at: day(9), text: 'Veeam job failing · KS-2008' }] },
	{ tag: 'PH-NET-0009', name: 'Cisco Catalyst 2960', detail: 'Core switch · EOL', serial: 'C2960-0009', category: 'network', clientId: 'c_ph', site: 'Trans Amadi depot', location: 'Comms room', status: 'Healthy', agent: 'SNMP', warrantyAt: day(400), openTicketKey: 'NET-4', firmware: 'IOS 15.2', history: [{ at: day(5), text: 'Replacement scheduled · NET-4' }] },
	{ tag: 'KT-SRV-0001', name: 'Dell PowerEdge R540', detail: 'FS01 · file server', serial: 'R540-FS01', category: 'server', clientId: 'c_kano', site: 'Bompai factory', location: 'IT room', status: 'Down', statusDetail: 'Isolated', agent: 'Offline 2h', warrantyAt: ahead(60), openTicketKey: 'KS-2044', history: [{ at: hr(2), text: 'Ransomware alert · isolated from LAN · KS-2044' }] },
	{ tag: 'KT-NVR-0003', name: 'Hikvision NVR 16ch', detail: 'CCTV · 8TB', serial: 'HIK-NVR-0003', category: 'endpoint', clientId: 'c_kano', site: 'Bompai factory', status: 'Healthy', agent: 'Online', warrantyAt: ahead(200), history: [{ at: day(4), text: 'Retention reduced to 30 days · KS-2019' }] },
	{ tag: 'SM-LIC-0004', name: 'Fortinet FortiCare', detail: '2 × FortiGate 100F · annual', serial: 'FC-100F-0004', category: 'licence', clientId: 'c_surulere', site: 'All sites', status: 'Expiring', agent: '—', warrantyAt: ahead(40), history: [] },
	{ tag: 'IU-PRN-0002', name: 'HP LaserJet M507', detail: 'Bookshop printer', serial: 'HPLJ-0002', category: 'endpoint', clientId: 'c_ibadan', site: 'Bookshop · Dugbe', status: 'Healthy', agent: 'n/a', warrantyAt: ahead(300), history: [] },
];

// ---------------------------------------------------------------------------
// Visits (today, Lagos region unless stated)

export const visits: Visit[] = [
	{ id: 'v1', ticketKey: 'KS-2043', title: 'POS terminals offline at Ikeja branch', clientId: 'c_lekki', site: 'Ikeja branch', address: '24 Allen Avenue', priority: 'P1', engineerId: 'u_chinedu', status: 'On site', startAt: at(9, 0), durationMin: 150, region: 'Lagos', mapX: 24, mapY: 24, checkpoints: [{ label: 'Dispatched', at: at(8, 24), done: true }, { label: 'Left Ikeja office', at: at(8, 31), done: true }, { label: 'Checked in · GPS verified', at: at(9, 22), done: true }, { label: 'Working', done: false }, { label: 'Client sign-off & photos', done: false }, { label: 'Visit report', done: false }], parts: [{ name: '4G failover router (stock)', amount: 85_000, approval: 'needs approval' }, { name: 'Labour · covered by Gold', amount: 0, approval: 'covered' }] },
	{ id: 'v2', ticketKey: 'KS-2041', title: 'M365 migration follow-up at Lekki HQ', clientId: 'c_lekki', site: 'Head office', address: 'Plot 12 Admiralty Way', priority: 'P2', engineerId: 'u_chinedu', status: 'Scheduled', startAt: at(12, 0), durationMin: 120, region: 'Lagos', mapX: 80, mapY: 34, checkpoints: [{ label: 'Dispatched', done: false }, { label: 'Checked in', done: false }, { label: 'Working', done: false }, { label: 'Visit report', done: false }], parts: [] },
	{ id: 'v3', ticketKey: 'KS-2018', title: 'Switch replacement · VI branch', clientId: 'c_lekki', site: 'VI branch', address: '1004 Estate', priority: 'P3', engineerId: 'u_ibrahim', status: 'Done', startAt: at(8, 0), durationMin: 90, region: 'Lagos', mapX: 62, mapY: 60, checkpoints: [{ label: 'Dispatched', at: at(7, 40), done: true }, { label: 'Checked in', at: at(8, 5), done: true }, { label: 'Working', at: at(8, 10), done: true }, { label: 'Visit report', at: at(9, 25), done: true }], parts: [{ name: 'Cisco CBS250 switch', amount: 210_000, approval: 'approved' }] },
	{ id: 'v4', ticketKey: 'KS-2030', title: 'CCTV NVR not recording', clientId: 'c_surulere', site: 'Head office · Surulere', address: '5 Bode Thomas Street', priority: 'P3', engineerId: 'u_ibrahim', status: 'En route', startAt: at(10, 30), durationMin: 120, region: 'Lagos', mapX: 27, mapY: 58, checkpoints: [{ label: 'Dispatched', at: at(9, 50), done: true }, { label: 'Checked in', done: false }, { label: 'Working', done: false }, { label: 'Visit report', done: false }], parts: [] },
	{ id: 'v5', ticketKey: 'KS-2044', title: 'Ransomware containment · remote', clientId: 'c_kano', site: 'Bompai factory', address: 'Remote session', priority: 'P1', engineerId: 'u_emeka', status: 'On site', startAt: at(8, 0), durationMin: 300, region: 'Kano', mapX: 50, mapY: 50, checkpoints: [{ label: 'Session started', at: at(8, 2), done: true }, { label: 'Isolated FS01', at: at(8, 20), done: true }, { label: 'Scan complete', done: false }, { label: 'Report', done: false }], parts: [] },
	{ id: 'v6', ticketKey: 'KS-2039', title: 'UPS not switching on grid outage', clientId: 'c_abuja', site: 'Wuse 2 clinic', address: '14 Aminu Kano Crescent', priority: 'P2', status: 'Unscheduled', durationMin: 60, window: 'SLA 1h 50m', region: 'Abuja', mapX: 55, mapY: 40, checkpoints: [{ label: 'Dispatched', done: false }, { label: 'Checked in', done: false }, { label: 'Working', done: false }, { label: 'Visit report', done: false }], parts: [] },
	{ id: 'v7', ticketKey: 'KS-2033', title: 'Laptop imaging ×12', clientId: 'c_ph', site: 'Trans Amadi depot', address: 'Trans Amadi Industrial Layout', priority: 'P3', status: 'Unscheduled', durationMin: 240, window: 'any day this week', region: 'Port Harcourt', mapX: 40, mapY: 45, checkpoints: [{ label: 'Dispatched', done: false }, { label: 'Checked in', done: false }, { label: 'Working', done: false }, { label: 'Visit report', done: false }], parts: [] },
	{ id: 'v8', ticketKey: 'KS-2026', title: 'Quarterly server room check', clientId: 'c_lekki', site: 'Head office', address: 'Plot 12 Admiralty Way', priority: 'P4', status: 'Unscheduled', durationMin: 90, window: 'preventive', region: 'Lagos', mapX: 80, mapY: 34, checkpoints: [{ label: 'Dispatched', done: false }, { label: 'Checked in', done: false }, { label: 'Working', done: false }, { label: 'Visit report', done: false }], parts: [] },
	{ id: 'v9', ticketKey: 'KS-2024', title: 'Wi-Fi dead zones, 2nd floor', clientId: 'c_ibadan', site: 'Main press · Bodija', address: 'UI Road, Bodija', priority: 'P3', status: 'Unscheduled', durationMin: 120, window: 'Ibadan trip', region: 'Ibadan', mapX: 45, mapY: 50, checkpoints: [{ label: 'Dispatched', done: false }, { label: 'Checked in', done: false }, { label: 'Working', done: false }, { label: 'Visit report', done: false }], parts: [] },
	{ id: 'v10', ticketKey: 'KS-2025', title: 'Wi-Fi dead zone in warehouse B', clientId: 'c_ph', site: 'Trans Amadi depot', address: 'Warehouse B', priority: 'P3', engineerId: 'u_ibrahim', status: 'Scheduled', startAt: ahead(3) - 4 * 3600_000, durationMin: 180, region: 'Port Harcourt', mapX: 40, mapY: 45, checkpoints: [{ label: 'Dispatched', done: false }, { label: 'Checked in', done: false }, { label: 'Working', done: false }, { label: 'Visit report', done: false }], parts: [] },
	{ id: 'v11', ticketKey: 'NET-4', title: 'Replace core switch at Trans Amadi', clientId: 'c_ph', site: 'Trans Amadi depot', address: 'Comms room', priority: 'P2', engineerId: 'u_ibrahim', status: 'Scheduled', startAt: ahead(1) + 5 * 3600_000, durationMin: 240, region: 'Port Harcourt', mapX: 40, mapY: 45, checkpoints: [{ label: 'Dispatched', done: false }, { label: 'Checked in', done: false }, { label: 'Working', done: false }, { label: 'Visit report', done: false }], parts: [{ name: 'Cisco Catalyst 9200', amount: 1_850_000, approval: 'approved' }] },
];

// ---------------------------------------------------------------------------
// Knowledge base

export const kbArticles: KbArticle[] = [
	{ id: 'a1', slug: 'reset-locked-m365-account', title: 'Resetting a locked Microsoft 365 account', category: 'Microsoft 365', summary: 'Unlock a user after too many failed sign-ins and reset MFA if their phone changed.', readMin: 3, views: 412, helpful: 38, notHelpful: 2, updatedAt: day(6), authorId: 'u_funke', visibility: 'public', status: 'Published', tags: ['m365', 'identity'], body: 'When a user reports **Your account has been locked**, Entra ID has blocked sign-in after 10 failed attempts.\n\n1. In the Entra admin centre, open **Users → the user → Authentication methods**.\n2. Choose **Reset password** and tick *Require change at next sign-in*.\n3. If the user changed phones, select **Require re-register MFA**.\n4. Ask the user to sign in on the web first, then Outlook mobile.\n\nSmart lockout resets after 60 seconds, so a second attempt usually works once the password is reset. Log the ticket under `Identity · Entra ID`.' },
	{ id: 'a2', slug: 'pos-offline-first-checks', title: 'POS terminals offline: first checks before calling support', category: 'Payments & POS', summary: 'Five things a branch manager can check in two minutes.', readMin: 5, views: 388, helpful: 51, notHelpful: 4, updatedAt: day(12), authorId: 'u_chinedu', visibility: 'public', status: 'Published', tags: ['pos', 'network', 'branch'], body: 'Most POS outages are connectivity, not the terminals.\n\n**Check in this order**\n\n1. Router WAN light: solid green means the ISP link is up. Red or blinking amber means the fibre is down.\n2. Power to the switch cabinet (look for the UPS display).\n3. Put one terminal on the hotspot SIM. If it works, the ISP is the problem.\n4. Restart the router once (30 s off).\n5. Note the time the terminals went offline and how many are affected.\n\nThen message support on WhatsApp with a photo of the router lights. Branch-down cases are treated as **P1** under Gold and Silver plans.' },
	{ id: 'a3', slug: 'understanding-your-sla', title: 'Understanding your SLA: response vs resolution times', category: 'Contracts & SLA', summary: 'What the response and resolution clocks mean and when they pause.', readMin: 2, views: 260, helpful: 29, notHelpful: 1, updatedAt: day(20), authorId: 'u_adaeze', visibility: 'public', status: 'Published', tags: ['sla', 'contracts'], body: '**Response time** is how quickly a person replies to you. **Resolution time** is how long until the issue is fixed or a workaround is in place.\n\nClocks run during business hours unless your plan includes 24/7 P1 coverage. The clock **pauses** while we wait on you (for example, for site access) and during public holidays.\n\n| Plan | P1 | P2 | P3 |\n| Gold | 15m / 4h | 30m / 8h | 2h / 2d |\n| Silver | 30m / 8h | 1h / 1d | 4h / 3d |' },
	{ id: 'a4', slug: 'isp-failover-mikrotik', title: 'Runbook: ISP failover on Mikrotik RB4011', category: 'Runbooks', summary: 'Enable the 4G failover route when the primary fibre drops.', readMin: 6, views: 97, helpful: 12, notHelpful: 0, updatedAt: day(3), authorId: 'u_ibrahim', visibility: 'internal', status: 'Published', tags: ['mikrotik', 'runbook', 'network'], body: 'Use this runbook when a Gold site loses its fibre link and the 4G router is on site.\n\n1. Winbox → **IP → Routes**. Confirm the fibre route distance is 1 and the LTE route distance is 2.\n2. Enable **Netwatch** on 8.8.8.8 with a 30 s interval; down-script disables the fibre route.\n3. Check **IP → Firewall → NAT** has a masquerade rule on the LTE interface.\n4. Test with `ping 8.8.8.8 src-address=<LAN>` after pulling the fibre.\n5. Log the change on the asset and note the failover in the ticket.\n\nRevert by re-enabling the fibre route once the ISP confirms the fault is cleared (ask for the FibreOne reference).' },
	{ id: 'a5', slug: 'ups-not-switching-over', title: 'UPS not switching over during a NEPA cut', category: 'Power', summary: 'Diagnose battery age, transfer switch and load before replacing anything.', readMin: 4, views: 143, helpful: 17, notHelpful: 3, updatedAt: day(15), authorId: 'u_amina', visibility: 'internal', status: 'Published', tags: ['ups', 'power'], body: 'If a UPS drops the load the instant the grid goes off, the batteries are usually past their life.\n\n1. Read the battery health from the front panel or SNMP (`upsAdvBatteryCapacity`).\n2. Batteries older than 3 years in Lagos heat rarely hold charge; recommend replacement.\n3. Check the load percentage. Above 80% the runtime is seconds.\n4. On generator sites, confirm the ATS delay is at least 10 s so the UPS does not double-transfer.\n\nQuote batteries under **Hardware parts (quoted)** unless the contract includes them.' },
	{ id: 'a6', slug: 'whatsapp-reply-templates', title: 'WhatsApp reply templates and tone', category: 'Helpdesk playbook', summary: 'Approved templates for first response, updates and closure, in English and Pidgin.', readMin: 3, views: 221, helpful: 33, notHelpful: 1, updatedAt: day(30), authorId: 'u_funke', visibility: 'internal', status: 'Published', tags: ['whatsapp', 'templates'], body: '**First response (within 15 min for P1)**\n\n"Good morning {name}, thanks for reaching out. I have logged this as {key} ({priority}). Quick check: {question}?"\n\n**Update**\n\n"Engineer {engineer} is on the way, ETA {eta}. Meanwhile {workaround}."\n\n**Closure**\n\n"{key} is resolved: {summary}. Reply 1–5 to rate the service. Thank you!"\n\nKeep replies under 3 lines, avoid jargon, and always include the ticket key.' },
	{ id: 'a7', slug: 'onboarding-new-hire-devices', title: 'Onboarding checklist: new hire laptops', category: 'Endpoints', summary: 'Image, enrol, licence and hand over a Windows laptop in under an hour.', readMin: 4, views: 88, helpful: 9, notHelpful: 0, updatedAt: day(40), authorId: 'u_ngozi', visibility: 'internal', status: 'Published', tags: ['onboarding', 'endpoint'], body: '1. Apply the client standard image (Autopilot profile per client).\n2. Enrol in Intune and confirm compliance policy applies.\n3. Assign the M365 licence and add to the site groups.\n4. Install the agent and label the device with the asset tag.\n5. Record the asset with serial, user and warranty date.\n6. Hand over with the one-page welcome sheet.' },
	{ id: 'a8', slug: 'ndpr-data-requests', title: 'Handling NDPR subject access requests', category: 'Compliance', summary: 'How to log, verify and fulfil a data request within 30 days.', readMin: 3, views: 41, helpful: 5, notHelpful: 0, updatedAt: day(2), authorId: 'u_adaeze', visibility: 'internal', status: 'Draft', tags: ['ndpr', 'compliance'], body: 'Draft. Under the Nigeria Data Protection Regulation, subject requests must be answered within **30 days**.\n\n1. Log the request under Settings → Export / NDPR requests.\n2. Verify identity via the registered client contact.\n3. Export the ticket, contact and attachment data for that person.\n4. Review internal notes before sending.' },
];

// ---------------------------------------------------------------------------
// Settings

export const defaultSettings: OrgSettings = {
	general: { companyName: 'Kolanut Systems Ltd', slug: 'kolanut', rc: 'RC 1720044', tin: 'TIN 2034-5567-89', headOffice: '14 Oba Akran Avenue, Ikeja, Lagos', supportPhone: '+234 1 700 0000', supportEmail: 'support@kolanutsystems.ng', ticketPrefix: 'KS', timezone: 'Africa/Lagos · West Africa Time (GMT+1)', currency: '₦ NGN · Naira', vatPct: 7.5, dateFormat: '10 Sep 2026 · 24h', languages: ['English (NG)', 'Yoruba', 'Hausa', 'Igbo', 'Pidgin'] },
	businessHours: { weekdays: { on: true, from: '08:00', to: '18:00' }, saturday: { on: true, from: '09:00', to: '14:00' }, sunday: { on: false, from: '', to: '' } },
	branding: { accent: '#1e3a47', portalName: 'Kolanut Support', portalTagline: 'IT support for Nigerian businesses', emailFooter: 'Kolanut Systems Ltd · 14 Oba Akran Avenue, Ikeja · support@kolanutsystems.ng', logoInitials: 'KS' },
	security: { enforce2fa: true, sessionHours: 12, ssoDomain: 'kolanutsystems.ng', ssoProvider: 'Google Workspace', ipAllowlist: '', passwordMinLength: 12 },
	channels: { whatsapp: { enabled: true, number: '+234 803 555 0100', templatesApproved: 6 }, email: { enabled: true, address: 'support@kolanutsystems.ng', forwardFrom: 'helpdesk@kolanutsystems.ng' }, phone: { enabled: true, number: '+234 1 700 0000', ivr: false }, portal: { enabled: true, url: 'support.kolanutsystems.ng', allowGuest: false } },
	slaPolicies: [
		{ id: 'gold', plan: 'Gold', name: 'Gold retainer', clients: 9, note: 'default for retainers ≥ ₦1.5M', p1AllHours: true, escalateAt75: true, rows: [
			{ priority: 'P1 · Critical', desc: 'branch / system down', responseMin: 15, resolveHours: 4, coverage: '24/7', escalation: 'Page on-call → Adaeze at 50%', compliance: 96 },
			{ priority: 'P2 · High', desc: 'degraded, many users', responseMin: 30, resolveHours: 8, coverage: 'Business hours', escalation: 'Team lead at 75%', compliance: 92 },
			{ priority: 'P3 · Normal', desc: '', responseMin: 120, resolveHours: 48, coverage: 'Business hours', escalation: 'Reminder at 75%', compliance: 86 },
			{ priority: 'P4 · Low', desc: 'requests, licences', responseMin: 480, resolveHours: 120, coverage: 'Business hours', escalation: '—', compliance: 98 },
		] },
		{ id: 'silver', plan: 'Silver', name: 'Silver', clients: 14, p1AllHours: false, escalateAt75: true, rows: [
			{ priority: 'P1', desc: '', responseMin: 30, resolveHours: 8, coverage: 'Extended (07:00–22:00)', escalation: 'Team lead at 50%', compliance: 93 },
			{ priority: 'P2', desc: '', responseMin: 60, resolveHours: 24, coverage: 'Business hours', escalation: 'Team lead at 75%', compliance: 90 },
			{ priority: 'P3', desc: '', responseMin: 240, resolveHours: 72, coverage: 'Business hours', escalation: 'Reminder', compliance: 84 },
		] },
		{ id: 'bronze', plan: 'Bronze', name: 'Bronze / pay-as-you-go', clients: 19, note: 'trial accounts', p1AllHours: false, escalateAt75: false, rows: [
			{ priority: 'P1', desc: '', responseMin: 60, resolveHours: 24, coverage: 'Business hours', escalation: 'Reminder', compliance: 91 },
			{ priority: 'P2 – P4', desc: '', responseMin: 240, resolveHours: 120, coverage: 'Business hours', escalation: '—' },
		] },
	],
	ticketTypes: [
		{ id: 'tt1', name: 'Incident', type: 'support', categories: ['Network', 'Power', 'Security', 'Endpoint', 'Cloud'], enabled: true },
		{ id: 'tt2', name: 'Service request', type: 'task', categories: ['Onboarding', 'Licensing', 'Access', 'Procurement'], enabled: true },
		{ id: 'tt3', name: 'Maintenance', type: 'task', categories: ['Preventive', 'Firmware', 'Backup check'], enabled: true },
		{ id: 'tt4', name: 'Software bug', type: 'bug', categories: ['PayBridge', 'Engineer app', 'Custom apps'], enabled: true },
		{ id: 'tt5', name: 'Change request', type: 'story', categories: ['Feature', 'Improvement'], enabled: false },
	],
	automation: [
		{ id: 'au1', name: 'Auto-assign by asset', trigger: 'Ticket created', condition: 'Asset has an assigned engineer', action: 'Assign to the asset engineer', enabled: true, runs: 142 },
		{ id: 'au2', name: 'Branch-down → P1', trigger: 'Ticket created via WhatsApp', condition: 'Text contains "down", "offline" or "no connection" and plan is Gold', action: 'Set priority P1 · notify on-call', enabled: true, runs: 38 },
		{ id: 'au3', name: 'SLA 75% reminder', trigger: 'SLA clock reaches 75%', condition: 'Ticket still open', action: 'Notify assignee and team lead', enabled: true, runs: 511 },
		{ id: 'au4', name: 'Close after 48h resolved', trigger: 'Daily at 02:00', condition: 'Resolved for 48h with no client reply', action: 'Set status Closed · send CSAT', enabled: true, runs: 980 },
		{ id: 'au5', name: 'Month-end payroll watch', trigger: 'Ticket created 25th–31st', condition: 'Category is Payroll', action: 'Set priority P2 · add label month-end', enabled: false, runs: 12 },
	],
	csat: { enabled: true, channel: 'WhatsApp, then email', delayHours: 2, question: 'How was the service on {key}? Reply 1–5.', followUpBelow: 3 },
	plans: [
		{ tier: 'Gold', name: 'Gold retainer', monthly: 2_400_000, hours: 40, overage: 18_000, description: 'P1 24/7, field visits, assets, WhatsApp, SLAs' },
		{ tier: 'Silver', name: 'Silver', monthly: 1_150_000, hours: 20, overage: 20_000, description: 'Extended P1 hours, field visits, assets' },
		{ tier: 'Bronze', name: 'Bronze / pay-as-you-go', monthly: 450_000, hours: 10, overage: 25_000, description: 'Business hours, helpdesk and portal' },
	],
	invoicing: { prefix: 'INV-', dueDays: 30, vatNumberShown: true, bankName: 'GTBank', bankAccount: '0123456789', accountName: 'Kolanut Systems Ltd', reminderDays: [7, 1, -3] },
	portal: { enabled: true, kbPublic: true, allowAttachments: true, showSla: true, csatOnPortal: true, customDomain: '' },
	integrations: [
		{ id: 'whatsapp', name: 'WhatsApp Business API', description: 'Two-way conversations, templates and CSAT over WhatsApp.', connected: true, detail: 'Meta · +234 803 555 0100' },
		{ id: 'google', name: 'Google Workspace', description: 'SSO, calendar for visits, shared mailbox intake.', connected: true, detail: 'kolanutsystems.ng' },
		{ id: 'm365', name: 'Microsoft 365', description: 'Tenant health, licence counts and mail intake for clients.', connected: false },
		{ id: 'paystack', name: 'Paystack', description: 'Card, bank transfer and USSD payments for invoices.', connected: true, detail: 'Live mode' },
		{ id: 'github', name: 'GitHub', description: 'Link commits and pull requests to PayBridge issues.', connected: true, detail: 'kolanut/paybridge' },
		{ id: 'slack', name: 'Slack', description: 'P1 alerts and daily digests in #helpdesk.', connected: false },
		{ id: 'zabbix', name: 'Zabbix monitoring', description: 'Create tickets from device alerts; ping and SNMP status on assets.', connected: true, detail: '312 hosts' },
	],
	apiKeys: [{ id: 'k1', name: 'Zabbix alert bridge', prefix: 'ld_live_7f3a', createdAt: day(120), lastUsedAt: min(6), scopes: ['tickets:write', 'assets:read'] }],
	webhooks: [{ id: 'w1', url: 'https://hooks.slack.com/services/T0…/B0…', events: ['ticket.created', 'sla.breached'], enabled: false, lastStatus: 'never delivered' }],
	billing: { plan: 'Growth', seats: 12, pricePerSeat: 32_000, renewsAt: ahead(19), paymentMethod: 'Verve •••• 4421 · bank transfer backup', usage: { whatsappConversations: 1_842, whatsappLimit: 2_500, sms: 312, smsLimit: 1_000, storageGb: 18.4, storageLimit: 50 } },
	auditEnabled: true,
};
