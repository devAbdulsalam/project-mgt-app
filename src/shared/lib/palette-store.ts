import { create } from 'zustand';

interface PaletteState {
	open: boolean;
	/** Ticket the palette should offer contextual actions for (focused row / open panel). */
	focusedKey?: string;
	setOpen: (open: boolean) => void;
	toggle: () => void;
	setFocusedKey: (key?: string) => void;
}

export const usePaletteStore = create<PaletteState>()((set, get) => ({
	open: false,
	focusedKey: undefined,
	setOpen: (open) => set({ open }),
	toggle: () => set({ open: !get().open }),
	setFocusedKey: (focusedKey) => set({ focusedKey }),
}));
