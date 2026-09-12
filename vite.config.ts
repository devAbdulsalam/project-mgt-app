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
});
