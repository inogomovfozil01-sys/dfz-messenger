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
          bg: 'color-mix(in srgb, var(--bg-main) calc(<alpha-value> * 100%), transparent)',
          surface: 'color-mix(in srgb, var(--bg-surface) calc(<alpha-value> * 100%), transparent)',
          'surface-secondary': 'color-mix(in srgb, var(--bg-surface-secondary) calc(<alpha-value> * 100%), transparent)',
          'surface-hover': 'color-mix(in srgb, var(--bg-surface-hover) calc(<alpha-value> * 100%), transparent)',
          'surface-active': 'color-mix(in srgb, var(--bg-surface-active) calc(<alpha-value> * 100%), transparent)',
          border: 'color-mix(in srgb, var(--border-subtle) calc(<alpha-value> * 100%), transparent)',
          'border-focus': 'color-mix(in srgb, var(--border-focus) calc(<alpha-value> * 100%), transparent)',
          text: 'color-mix(in srgb, var(--text-primary) calc(<alpha-value> * 100%), transparent)',
          'text-muted': 'color-mix(in srgb, var(--text-secondary) calc(<alpha-value> * 100%), transparent)',
          'text-subtle': 'color-mix(in srgb, var(--text-tertiary) calc(<alpha-value> * 100%), transparent)',
          accent: 'color-mix(in srgb, var(--accent-primary) calc(<alpha-value> * 100%), transparent)',
          'accent-hover': 'color-mix(in srgb, var(--accent-hover) calc(<alpha-value> * 100%), transparent)',
          'accent-subtle': 'color-mix(in srgb, var(--accent-subtle) calc(<alpha-value> * 100%), transparent)',
          danger: 'color-mix(in srgb, var(--color-danger) calc(<alpha-value> * 100%), transparent)',
          'danger-hover': 'color-mix(in srgb, var(--color-danger-hover) calc(<alpha-value> * 100%), transparent)',
          success: 'color-mix(in srgb, var(--color-success) calc(<alpha-value> * 100%), transparent)',
          warning: 'color-mix(in srgb, var(--color-warning) calc(<alpha-value> * 100%), transparent)',
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
