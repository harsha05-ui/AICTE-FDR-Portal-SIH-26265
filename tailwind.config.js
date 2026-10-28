/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: 'hsl(var(--navy-950) / <alpha-value>)',
          900: 'hsl(var(--navy-900) / <alpha-value>)',
          800: 'hsl(var(--navy-800) / <alpha-value>)',
          700: 'hsl(var(--navy-700) / <alpha-value>)',
          600: 'hsl(var(--navy-600) / <alpha-value>)',
          500: 'hsl(var(--navy-500) / <alpha-value>)',
          100: 'hsl(var(--navy-100) / <alpha-value>)',
          50: 'hsl(var(--navy-50) / <alpha-value>)',
        },
        canvas: {
          DEFAULT: 'hsl(var(--canvas) / <alpha-value>)',
          subtle: 'hsl(var(--canvas-subtle) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'hsl(var(--surface) / <alpha-value>)',
          raised: 'hsl(var(--surface-raised) / <alpha-value>)',
        },
        ink: {
          900: 'hsl(var(--ink-900) / <alpha-value>)',
          700: 'hsl(var(--ink-700) / <alpha-value>)',
          500: 'hsl(var(--ink-500) / <alpha-value>)',
          400: 'hsl(var(--ink-400) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'hsl(var(--line) / <alpha-value>)',
          strong: 'hsl(var(--line-strong) / <alpha-value>)',
          subtle: 'hsl(var(--line-subtle) / <alpha-value>)',
        },
        brand: {
          lime: 'hsl(var(--brand-lime) / <alpha-value>)',
          blue: 'hsl(var(--brand-blue) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'hsl(var(--success) / <alpha-value>)',
          subtle: 'hsl(var(--success-subtle) / <alpha-value>)',
          text: 'hsl(var(--success-text) / <alpha-value>)',
          border: 'hsl(var(--success-border) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning) / <alpha-value>)',
          subtle: 'hsl(var(--warning-subtle) / <alpha-value>)',
          text: 'hsl(var(--warning-text) / <alpha-value>)',
          border: 'hsl(var(--warning-border) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'hsl(var(--danger) / <alpha-value>)',
          subtle: 'hsl(var(--danger-subtle) / <alpha-value>)',
          text: 'hsl(var(--danger-text) / <alpha-value>)',
          border: 'hsl(var(--danger-border) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'hsl(var(--info) / <alpha-value>)',
          subtle: 'hsl(var(--info-subtle) / <alpha-value>)',
          text: 'hsl(var(--info-text) / <alpha-value>)',
          border: 'hsl(var(--info-border) / <alpha-value>)',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '14px',
        xl: '18px',
        DEFAULT: '8px',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'monospace'],
      },
      boxShadow: {
        'level-1': '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.04)',
        'level-2': '0 6px 16px -4px rgba(15, 23, 42, 0.07), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        'level-3': '0 24px 48px -12px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(15, 23, 42, 0.06)',
      },
      transitionDuration: {
        instant: '90ms',
        fast: '150ms',
        base: '220ms',
        slow: '320ms',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
        standard: 'cubic-bezier(0.22, 1, 0.36, 1)',
        enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
        exit: 'cubic-bezier(0.3, 0, 1, 1)',
      }
    },
  },
  plugins: [],
}
