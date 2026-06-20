/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f1f5f9', // slate-100 (softer, darker than white)
        surface: '#ffffff', // white
        border: '#e2e8f0', // slate-200
        primary: '#4f46e5', // indigo-600 (very aesthetic, professional blue-purple)
        secondary: '#94a3b8',
        hot: '#ef4444',
        warm: '#eab308',
        cold: '#3b82f6',
        won: '#22c55e',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        }
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
      }
    },
  },
  plugins: [],
}
