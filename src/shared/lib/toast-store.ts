import { create } from 'zustand';

export interface Toast {
	id: number;
	title: string;
	description?: string;
	tone?: 'default' | 'success' | 'danger';
	action?: { label: string; onClick: () => void };
}

interface ToastState {
	toasts: Toast[];
	push: (t: Omit<Toast, 'id'>) => void;
	dismiss: (id: number) => void;
}

let seq = 0;

export const useToastStore = create<ToastState>()((set, get) => ({
	toasts: [],
	push: (t) => {
		const id = ++seq;
		set({ toasts: [...get().toasts, { ...t, id }] });
		setTimeout(() => get().dismiss(id), 4500);
	},
	dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (title: string, opts: Omit<Toast, 'id' | 'title'> = {}) => useToastStore.getState().push({ title, ...opts });
