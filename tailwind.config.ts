import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#f4f0e7',
        navy: '#13232f',
        gold: '#b8965b',
        'gold-dark': '#8f6c34',
        line: 'rgba(19, 35, 47, 0.15)',
        brand: {
          50: '#faf7f0',
          100: '#eee4cf',
          500: '#b8965b',
          600: '#8f6c34',
          700: '#13232f',
          800: '#0d1a23',
        },
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-italiana)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
