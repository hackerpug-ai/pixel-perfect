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
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		}
	}
};

export default preview;
