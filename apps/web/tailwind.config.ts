import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dfz: {
          bg: 'var(--bg-main)',
          surface: 'var(--bg-surface)',
          'surface-hover': 'var(--bg-surface-hover)',
          'surface-active': 'var(--bg-surface-active)',
          border: 'var(--border-subtle)',
          'border-focus': 'var(--border-focus)',
          text: 'var(--text-primary)',
          'text-muted': 'var(--text-secondary)',
          'text-subtle': 'var(--text-tertiary)',
          accent: 'var(--accent-primary)',
          'accent-hover': 'var(--accent-hover)',
          'accent-subtle': 'var(--accent-subtle)',
          danger: 'var(--color-danger)',
          'danger-hover': 'var(--color-danger-hover)',
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
        },
      },
      borderRadius: {
        'dfz-sm': '6px',
        'dfz-md': '10px',
        'dfz-lg': '14px',
        'dfz-xl': '18px',
        'dfz-full': '9999px',
      },
      boxShadow: {
        'dfz-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'dfz-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'dfz-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'dfz-dropdown': '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
      },
      keyframes: {
        'message-in': {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'message-in': 'message-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fade-in 0.15s ease-out forwards',
        'scale-in': 'scale-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};

export default config;
