import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F9F8F4',
        surface: '#F1EFEA',
        ink: '#181A18',
        muted: '#545854',
        brass: '#9A7B3E',
        line: '#DFDDD6',
        cream: '#F9F8F4',
        'cream-deep': '#F1EFEA',
        navy: '#181A18',
        gold: '#9A7B3E',
        'gold-dark': '#9A7B3E',
        brand: {
          DEFAULT: '#1B3B2B',
          50: '#F9F8F4',
          100: '#F1EFEA',
          500: '#1B3B2B',
          600: '#1B3B2B',
          700: '#12291E',
          800: '#0E2117',
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
