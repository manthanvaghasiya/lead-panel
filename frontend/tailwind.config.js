/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8fafc', // slate-50
        surface: '#ffffff', // white
        border: '#e2e8f0', // slate-200
        primary: '#06b6d4', // cyan-500
        secondary: '#94a3b8',
        hot: '#ef4444',
        warm: '#eab308',
        cold: '#3b82f6',
        won: '#22c55e',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
