import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Paleta inspirada en GG Electrics (azul tecnológico + ámbar solar)
        ink: {
          950: '#050B14',
          900: '#081626',
          800: '#0E2238',
          700: '#15324E',
          600: '#1E4566',
        },
        sky: {
          400: '#3FA6E0',
          500: '#1F8FD6',
          600: '#0E6FB6', // azul de marca
          700: '#0A578F',
        },
        amber: {
          300: '#FCC56B',
          400: '#F5B23E',
          500: '#EE9F1E', // ámbar de marca
          600: '#D8841A',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'grid-glow':
          'radial-gradient(circle at 20% 20%, rgba(31,143,214,0.25), transparent 45%), radial-gradient(circle at 85% 15%, rgba(238,159,30,0.18), transparent 40%), radial-gradient(circle at 50% 100%, rgba(14,111,182,0.25), transparent 50%)',
      },
      boxShadow: {
        glow: '0 2px 16px rgba(14,111,182,0.12), 0 1px 4px rgba(14,111,182,0.06)',
        'glow-amber': '0 0 0 1px rgba(238,159,30,0.4), 0 8px 32px -6px rgba(238,159,30,0.45)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.6' },
          '70%': { transform: 'scale(1.4)', opacity: '0' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
      },
      animation: {
        shimmer: 'shimmer 2.4s linear infinite',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
