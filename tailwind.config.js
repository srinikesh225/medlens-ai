/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Calm clinical neutrals (ink)
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5dae2',
          300: '#b0bac9',
          400: '#8593a8',
          500: '#64748b',
          600: '#4f5d70',
          700: '#414c5c',
          800: '#39424f',
          900: '#0f1720',
        },
        // Primary — trustworthy clinical teal-blue
        primary: {
          50: '#eef7f7',
          100: '#d5eeef',
          200: '#aadddf',
          300: '#75c4c8',
          400: '#43a4aa',
          500: '#2a888f',
          600: '#226e76',
          700: '#1f5960',
          800: '#1d494f',
          900: '#123339',
        },
        // Provenance badge accents
        prov: {
          user: '#0e7490',   // cyan-700  — user provided
          doc: '#1d4ed8',    // blue-700  — document extracted
          ai: '#7c3aed',     // violet-600 — ai generated
          verified: '#b45309', // amber-700 — human verified (orange badge)
          conflict: '#be123c', // rose-700 — conflict
        },
        status: {
          low: '#1d4ed8',    // blue — deliberately NOT red (never red/green only)
          normal: '#047857', // emerald
          high: '#b91c1c',   // red
          unknown: '#57534e', // stone — range unavailable
        },
        // Soft lavender-gray app canvas (Medcure-inspired ground)
        canvas: {
          DEFAULT: '#e9ebf4',
          50: '#f3f4fa',
          100: '#e9ebf4',
          200: '#dcdfee',
        },
        // Signature gold CTA accent
        accent: {
          50: '#fdf8e7',
          100: '#fbefc4',
          300: '#f5d24d',
          400: '#f2c635',
          500: '#e6b21f',
          600: '#c8961a',
          700: '#7a5c12',
        },
        // Coral used for vitals / abnormal data viz
        vital: {
          50: '#fff1f2',
          400: '#fb6f84',
          500: '#f43f5e',
          600: '#e11d48',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,32,0.03), 0 6px 16px -10px rgba(15,23,32,0.10)',
        panel: '0 2px 6px rgba(15,23,32,0.05), 0 18px 40px -20px rgba(15,23,32,0.18)',
        lift: '0 10px 30px -14px rgba(18,51,57,0.28)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'sweep': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        'pulse-soft': 'pulse-soft 1.6s ease-in-out infinite',
        'sweep': 'sweep 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
