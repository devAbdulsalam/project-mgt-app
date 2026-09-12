import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
	sidebarCollapsed: boolean;
	bannerDismissed: boolean;
	toggleSidebar: () => void;
	dismissBanner: () => void;
}

export const useUiStore = create<UiState>()(
	persist(
		(set, get) => ({
			sidebarCollapsed: false,
			bannerDismissed: false,
			toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
			dismissBanner: () => set({ bannerDismissed: true }),
		}),
		{ name: 'ledgedesk.ui' },
	),
);
