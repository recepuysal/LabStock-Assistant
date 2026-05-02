/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      colors: {
        ls: {
          canvas: '#f1f5f9',
          surface: '#ffffff',
          muted: '#f8fafc',
          line: '#e2e8f0',
          lineStrong: '#cbd5e1',
          sidebar: '#fafbfc',
          accent: '#0d9488',
          accentHover: '#0f766e',
          accentSoft: '#ccfbf1',
          accentText: '#134e4a',
        },
      },
      boxShadow: {
        bar: '0 1px 0 0 rgb(15 23 42 / 0.06)',
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 4px 12px -2px rgb(15 23 42 / 0.06)',
        float: '0 8px 30px -8px rgb(15 23 42 / 0.12), 0 4px 12px -4px rgb(15 23 42 / 0.06)',
        bubble: '0 2px 8px -2px rgb(13 148 136 / 0.35)',
        inset: 'inset 0 1px 2px 0 rgb(15 23 42 / 0.04)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      backgroundImage: {
        'mesh': 'radial-gradient(1200px circle at 0% -20%, rgb(204 251 241 / 0.5), transparent 45%), radial-gradient(800px circle at 100% 0%, rgb(241 245 249 / 1), transparent 40%)',
        'brand': 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}
