import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		tailwindcss(),
		react(),
		babel({ presets: [reactCompilerPreset()] }),
	],
	build: {
		rolldownOptions: {
			output: {
				codeSplitting: {
					groups: [
						{ name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
						{ name: 'router', test: /node_modules[\\/]@tanstack[\\/]/ },
						{ name: 'charts', test: /node_modules[\\/](recharts|d3-|victory-vendor|internmap|delaunator|robust-predicates)/ },
						{ name: 'forms', test: /node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/ },
					],
				},
			},
		},
	},
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	server: {
		proxy: {
			// Serving the API from the same origin as the app is what makes the
			// httpOnly refresh cookie work: ApiClient calls fetch() without
			// `credentials: 'include'`, and fetch defaults to 'same-origin', so a
			// cross-origin API would never receive the cookie. It also means no
			// CORS configuration is needed in development.
			'/api': {
				// Override with VITE_API_PROXY_TARGET to point the app at a different
				// backend — a throwaway instance, say — without editing this file.
				target: process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:4000',
				changeOrigin: false,
			},
		},
	},
});
