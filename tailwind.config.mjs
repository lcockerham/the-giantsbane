/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        parchment: '#e8d5b0',
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e8c96a',
          dark: '#9a7a2a',
        },
        stone: {
          950: '#1a1209',
          900: '#231808',
          800: '#2d2010',
          700: '#3d2d18',
          600: '#574230',
        },
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        crimson: ['"Crimson Text"', 'Georgia', 'serif'],
      },
      typography: (theme) => ({
        giantsbane: {
          css: {
            '--tw-prose-body': theme('colors.parchment'),
            '--tw-prose-headings': theme('colors.gold.DEFAULT'),
            '--tw-prose-links': theme('colors.gold.light'),
            '--tw-prose-bold': theme('colors.parchment'),
            '--tw-prose-bullets': theme('colors.gold.dark'),
            '--tw-prose-hr': theme('colors.stone.700'),
            '--tw-prose-quotes': theme('colors.parchment'),
            '--tw-prose-quote-borders': theme('colors.gold.dark'),
            '--tw-prose-code': theme('colors.gold.light'),
            '--tw-prose-th-borders': theme('colors.stone.600'),
            '--tw-prose-td-borders': theme('colors.stone.700'),
            'font-family': theme('fontFamily.crimson').join(', '),
            'font-size': '1.125rem',
            'line-height': '1.8',
            h1: { 'font-family': theme('fontFamily.cinzel').join(', ') },
            h2: { 'font-family': theme('fontFamily.cinzel').join(', ') },
            h3: { 'font-family': theme('fontFamily.cinzel').join(', ') },
            h4: { 'font-family': theme('fontFamily.cinzel').join(', ') },
            'ul > li::marker': { color: theme('colors.gold.dark') },
            a: { 'text-decoration': 'none', 'border-bottom': `1px solid ${theme('colors.gold.dark')}` },
            'a:hover': { 'border-bottom-color': theme('colors.gold.light') },
            blockquote: {
              'background-color': theme('colors.stone.800'),
              'border-left-color': theme('colors.gold.dark'),
              padding: '0.75rem 1.25rem',
              'border-radius': '0 0.375rem 0.375rem 0',
            },
          },
        },
      }),
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
