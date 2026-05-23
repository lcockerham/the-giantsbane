/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        ink: '#e0d5cc',
        crimson: {
          DEFAULT: '#cc2222',
          dark: '#8b1a1a',
          muted: '#7a3030',
        },
        pit: {
          950: '#0d0d0d',
          900: '#111111',
          800: '#1a1a1a',
          700: '#222222',
          600: '#2a2a2a',
          500: '#333333',
        },
        dim: '#8a7060',
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        lora: ['Lora', 'Georgia', 'serif'],
      },
      typography: (theme) => ({
        blood: {
          css: {
            '--tw-prose-body': theme('colors.ink'),
            '--tw-prose-headings': theme('colors.ink'),
            '--tw-prose-links': theme('colors.crimson.DEFAULT'),
            '--tw-prose-bold': theme('colors.ink'),
            '--tw-prose-bullets': theme('colors.crimson.muted'),
            '--tw-prose-hr': theme('colors.pit.600'),
            '--tw-prose-quotes': theme('colors.dim'),
            '--tw-prose-quote-borders': theme('colors.crimson.dark'),
            '--tw-prose-code': theme('colors.crimson.DEFAULT'),
            '--tw-prose-th-borders': theme('colors.pit.500'),
            '--tw-prose-td-borders': theme('colors.pit.600'),
            'font-family': theme('fontFamily.lora').join(', '),
            'font-size': '1.1rem',
            'line-height': '1.85',
            h1: { 'font-family': theme('fontFamily.cinzel').join(', '), 'font-weight': '600' },
            h2: { 'font-family': theme('fontFamily.cinzel').join(', '), 'font-weight': '600' },
            h3: { 'font-family': theme('fontFamily.cinzel').join(', '), 'font-weight': '600' },
            h4: { 'font-family': theme('fontFamily.cinzel').join(', ') },
            a: {
              color: theme('colors.crimson.DEFAULT'),
              'text-decoration': 'none',
              'border-bottom': `1px solid ${theme('colors.crimson.dark')}`,
            },
            'a:hover': {
              color: '#e04444',
              'border-bottom-color': theme('colors.crimson.DEFAULT'),
            },
            blockquote: {
              'background-color': theme('colors.pit.800'),
              'border-left-color': theme('colors.crimson.dark'),
              padding: '0.75rem 1.25rem',
              'border-radius': '0 0.375rem 0.375rem 0',
              'font-style': 'italic',
              color: theme('colors.dim'),
            },
            'ul > li::marker': { color: theme('colors.crimson.muted') },
            'ol > li::marker': { color: theme('colors.crimson.muted') },
          },
        },
      }),
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
