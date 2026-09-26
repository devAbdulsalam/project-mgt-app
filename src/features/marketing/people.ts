/* Placeholder faces for the marketing mockups — one per person so the same
   name shows the same face in the hero, the app window and the Connect band. */
const portrait = (set: 'women' | 'men', n: number) => `https://randomuser.me/api/portraits/${set}/${n}.jpg`;

const photos: Record<string, string> = {
	'Adaeze Okonkwo': portrait('women', 44),
	'Chinedu Eze': portrait('men', 32),
	'Amina Yusuf': portrait('women', 26),
	'Funke Adeyemi': portrait('women', 68),
	'Emeka Nwosu': portrait('men', 62),
	'Sara Ali': portrait('women', 12),
	'Ibrahim Musa': portrait('men', 75),
};

export const photoOf = (name: string) => photos[name];
