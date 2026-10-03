/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Emergency Response Palette
        emergency: {
          red: '#DC2626',
          'red-light': '#FEF2F2',
          'red-border': '#FCA5A5',
          green: '#16A34A',
          'green-light': '#F0FDF4',
          'green-border': '#86EFAC',
          blue: '#0284C7',
          'blue-light': '#F0F9FF',
          'blue-border': '#BAE6FD',
          amber: '#D97706',
          'amber-light': '#FFFBEB',
          'amber-border': '#FDE68A',
        }
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'hud': '0 8px 30px rgba(15, 23, 42, 0.12)',
        'glow-red': '0 0 15px -2px rgba(220, 38, 38, 0.35)',
        'glow-green': '0 0 15px -2px rgba(22, 163, 74, 0.35)',
        'glow-blue': '0 0 15px -2px rgba(2, 132, 199, 0.35)',
      }
    },
  },
  plugins: [],
}
