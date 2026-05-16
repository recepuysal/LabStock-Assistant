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
          canvas: 'rgb(var(--ls-canvas) / <alpha-value>)',
          surface: 'rgb(var(--ls-surface) / <alpha-value>)',
          elevated: 'rgb(var(--ls-elevated) / <alpha-value>)',
          muted: 'rgb(var(--ls-muted) / <alpha-value>)',
          sidebar: 'rgb(var(--ls-sidebar) / <alpha-value>)',
          line: 'rgb(var(--ls-line) / <alpha-value>)',
          'line-strong': 'rgb(var(--ls-line-strong) / <alpha-value>)',
          text: 'rgb(var(--ls-text) / <alpha-value>)',
          'text-muted': 'rgb(var(--ls-text-muted) / <alpha-value>)',
          accent: 'rgb(var(--ls-accent) / <alpha-value>)',
          'accent-hover': 'rgb(var(--ls-accent-hover) / <alpha-value>)',
          'accent-soft': 'rgb(var(--ls-accent-soft) / <alpha-value>)',
          'accent-border': 'rgb(var(--ls-accent-border) / <alpha-value>)',
          'on-accent': 'rgb(var(--ls-on-accent) / <alpha-value>)',
          danger: 'rgb(var(--ls-danger) / <alpha-value>)',
          'danger-soft': 'rgb(var(--ls-danger-soft) / <alpha-value>)',
          warn: 'rgb(var(--ls-warn) / <alpha-value>)',
          'warn-soft': 'rgb(var(--ls-warn-soft) / <alpha-value>)',
        },
      },
      boxShadow: {
        sm: 'var(--ls-shadow-sm)',
        md: 'var(--ls-shadow-md)',
        nav: 'var(--ls-shadow-nav)',
        card: 'var(--ls-shadow-sm)',
        float: 'var(--ls-shadow-md)',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.625rem',
        xl: '0.75rem',
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}
