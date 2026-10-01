import type { Preview } from '@storybook/sveltekit';
import '../src/app.css';

const preview: Preview = {
	globalTypes: {
		theme: {
			description: 'Colour theme (sets data-theme on <html>, as the site toggle does)',
			toolbar: {
				title: 'Theme',
				icon: 'contrast',
				items: [
					{ value: 'light', title: 'Light' },
					{ value: 'dark', title: 'Dark' }
				],
				dynamicTitle: true
			}
		}
	},
	initialGlobals: { theme: 'light' },
	decorators: [
		(story, context) => {
			document.documentElement.dataset.theme = context.globals.theme ?? 'light';
			return story();
		}
	],
	parameters: {
		layout: 'fullscreen',
		// The two platform widths (manifest platforms), so a screen can be reviewed at each in the sandbox.
		viewport: {
			options: {
				desktop: { name: 'Desktop (web-desktop, 1440)', styles: { width: '1440px', height: '900px' }, type: 'desktop' },
				phone: { name: 'Phone (web-mobile, 390)', styles: { width: '390px', height: '844px' }, type: 'mobile' }
			}
		},
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		}
	}
};

export default preview;
