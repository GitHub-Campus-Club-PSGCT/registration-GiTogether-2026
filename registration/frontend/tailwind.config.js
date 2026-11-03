/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f0',
          100: '#ffdcd8',
          200: '#ffb4ac',
          300: '#ff7f73',
          400: '#ff4a3d',
          500: '#f01e12',
          600: '#e10600',
          700: '#b80500',
          800: '#8c0400',
          900: '#5e0200',
        },
        graphite: {
          50: '#f4f5f6',
          100: '#e4e6e9',
          200: '#c5c9cf',
          300: '#9ca2ab',
          400: '#737a85',
          500: '#555b65',
          600: '#3d424a',
          700: '#2a2d33',
          800: '#1a1c20',
          900: '#101114',
          950: '#0a0b0d',
        },
        steel: {
          300: '#d6dadf',
          400: '#b4bac2',
          500: '#8f969f',
          600: '#6b727c',
        },
        success: {
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          300: '#fde68a',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      fontFamily: {
        display: ['Titillium Web', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        kenburns: {
          '0%': { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
        sweep: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        'line-grow': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        'icon-wave': {
          '0%': { transform: 'scale(1) rotate(0deg)' },
          '35%': { transform: 'scale(1.35) rotate(-14deg)' },
          '65%': { transform: 'scale(0.94) rotate(7deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.3s ease-out both',
        kenburns: 'kenburns 4s cubic-bezier(0.22, 1, 0.36, 1) both',
        sweep: 'sweep 2.4s ease-in-out infinite',
        'line-grow': 'line-grow 1.2s cubic-bezier(0.22, 1, 0.36, 1) both',
        'icon-wave': 'icon-wave 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
        shake: 'shake 0.4s ease-in-out',
      },
    },
  },
  plugins: [],
};
