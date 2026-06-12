/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'Tajawal', 'system-ui', 'sans-serif'],
      },
      colors: {
        // لوحة ألوان دافئة لمطعم برجر
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // برتقالي أساسي
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        flame: {
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c', // أحمر برجر
          800: '#991b1b',
        },
        coal: {
          700: '#27272a',
          800: '#18181b',
          900: '#0f0f11', // أسود فحمي
          950: '#09090b',
        },
      },
      keyframes: {
        'pulse-ring': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(249, 115, 22, 0.6)' },
          '50%': { boxShadow: '0 0 0 12px rgba(249, 115, 22, 0)' },
        },
        'flash-new': {
          '0%, 100%': { backgroundColor: 'rgba(249, 115, 22, 0.18)' },
          '50%': { backgroundColor: 'rgba(249, 115, 22, 0.45)' },
        },
        'flash-cancelled': {
          '0%, 100%': { backgroundColor: 'rgba(220, 38, 38, 0.12)' },
          '50%': { backgroundColor: 'rgba(220, 38, 38, 0.38)' },
        },
        'bell-shake': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '20%, 60%': { transform: 'rotate(-14deg)' },
          '40%, 80%': { transform: 'rotate(14deg)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.6s ease-in-out infinite',
        'flash-new': 'flash-new 1s ease-in-out 4',
        'flash-cancelled': 'flash-cancelled 1s ease-in-out 15',
        'bell-shake': 'bell-shake 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
