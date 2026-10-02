import { z } from 'zod';

export const profileSearchSchema = z.object({ section: z.enum(['profile', 'notifications', 'security', 'language', 'availability', 'shortcuts', 'invitations']).default('profile') });
export type ProfileSearch = z.infer<typeof profileSearchSchema>;
export type ProfileSection = ProfileSearch['section'];

export const profileSections: readonly { group: string; items: readonly (readonly [ProfileSection, string])[] }[] = [
	{ group: 'My account', items: [['profile', 'Profile'], ['notifications', 'Notifications'], ['security', 'Security & password'], ['language', 'Language & region']] },
	// Workspaces sit under Work rather than My account: which workspaces someone
	// belongs to is not a preference, and the invitations listed alongside them
	// are addressed to the person rather than to any one workspace.
	{ group: 'Work', items: [['invitations', 'Workspaces & invitations'], ['availability', 'Availability & shifts'], ['shortcuts', 'Keyboard shortcuts']] },
];

/** Resize an image file to a small square JPEG data URL for the avatar. */
export function fileToAvatarDataUrl(file: File, size = 192): Promise<string> {
	return new Promise((resolve, reject) => {
		if (!file.type.startsWith('image/')) return reject(new Error('Choose an image file (PNG, JPG or WebP).'));
		if (file.size > 8 * 1024 * 1024) return reject(new Error('Image is larger than 8 MB.'));
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = size;
			canvas.height = size;
			const ctx = canvas.getContext('2d');
			if (!ctx) return reject(new Error('Could not process the image.'));
			const s = Math.min(img.width, img.height);
			ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
			URL.revokeObjectURL(url);
			resolve(canvas.toDataURL('image/jpeg', 0.86));
		};
		img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
		img.src = url;
	});
}
