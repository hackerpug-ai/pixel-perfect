import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			paths: { base: '/pixel-perfect' },
			// export:social writes these after this build. Prerender crawls the new
			// links, and a missing file here is not a broken page.
			prerender: {
				entries: ['*', '/changelog'],
				handleHttpError: ({ path, message }) => {
					const writtenAfterBuild = new Set([
						'/pixel-perfect/og.png',
						'/pixel-perfect/favicon-16.png',
						'/pixel-perfect/favicon-32.png',
						'/pixel-perfect/favicon-64.png',
						'/pixel-perfect/apple-touch-icon.png'
					]);
					if (path && writtenAfterBuild.has(path)) return;
					throw new Error(message);
				}
			}
		})
	],
	// The Changelog page imports the repository's CHANGELOG.md (src/lib/changelog.ts), one level
	// above this project. Dev servers (vite dev, Storybook) refuse files outside the root without this.
	server: { fs: { allow: ['../CHANGELOG.md'] } }
});
