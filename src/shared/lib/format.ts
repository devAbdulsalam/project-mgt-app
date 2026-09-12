export function initials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((p) => p[0]!.toUpperCase())
		.join('');
}

export function formatLongDate(d: Date, timeZone = 'Africa/Lagos') {
	return new Intl.DateTimeFormat('en-GB', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone,
	}).format(d);
}

export function greeting(d = new Date()) {
	const h = d.getHours();
	if (h < 12) return 'Good morning';
	if (h < 17) return 'Good afternoon';
	return 'Good evening';
}

export function maskPhone(phone: string) {
	// "+234 803 555 0142" -> "+234 803 ••• 0142"
	const parts = phone.trim().split(' ');
	if (parts.length < 4) return phone;
	return `${parts[0]} ${parts[1]} ••• ${parts[parts.length - 1]}`;
}

export function slugify(s: string) {
	return s
		.toLowerCase()
		.replace(/ltd|limited|plc|inc|llc/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 24);
}

export function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}
