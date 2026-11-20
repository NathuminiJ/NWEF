import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F5F7FC',
        surface: '#E9EDF7',
        ink: '#041F4A',
        muted: '#4A5A79',
        brass: '#8A6C00',
        line: '#CDD5E5',
        cream: '#F5F7FC',
        'cream-deep': '#E9EDF7',
        navy: '#041F4A',
        gold: '#F7DA40',
        'gold-dark': '#E6C82D',
        accent: '#F7DA40',
        'accent-hover': '#E6C82D',
        danger: '#EF2636',
        'danger-hover': '#D41F2E',
        brand: {
          DEFAULT: '#041F4A',
          50: '#F5F7FC',
          100: '#E9EDF7',
          500: '#041F4A',
          600: '#041F4A',
          700: '#0B2D5E',
          800: '#031638',
        },
      },
      fontFamily: {
        sans: ['var(--font-plus-jakarta-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-newsreader)', 'Georgia', 'serif'],
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
