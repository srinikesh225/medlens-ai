import type { Config } from 'tailwindcss'

/**
 * MedLens design system — Tailwind theme.
 *
 * Colour tokens resolve to CSS custom properties declared in `src/index.css`
 * (see `src/design/tokens.ts` for the source-of-truth hex values). They are
 * stored as space-separated RGB channels so Tailwind's `/opacity` modifiers
 * (`bg-canvas/80`) continue to work.
 *
 * The `ink-*` / `primary-*` / `vital-*` scales at the bottom are DEPRECATED
 * compatibility aliases. They exist so the screens that have not yet been
 * migrated to the primitives keep building; they are remapped onto the new
 * palette, so those screens inherit the new colours without being restyled.
 * New code must use the named tokens only.
 */
const c = (v: string) => `rgb(var(${v}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* -------------------------------------------------------- surface */
        canvas: { DEFAULT: c('--canvas'), 50: c('--canvas'), 100: c('--canvas'), 200: c('--sunken') },
        card: c('--card'),
        sunken: c('--sunken'),
        border: c('--border'),

        /* ----------------------------------------------------------- text */
        secondary: c('--secondary'),
        muted: c('--muted'),
        faint: c('--faint'), // NON-TEXT only (icon strokes, gridlines)
        inverse: c('--inverse'),

        /* --------------------------------------------------------- accent */
        accent: {
          DEFAULT: c('--accent'),
          soft: c('--accent-soft'),
          /* deprecated aliases */
          50: c('--accent-soft'),
          100: c('--accent-soft'),
          300: c('--accent'),
          400: c('--accent'),
          500: c('--accent'),
          600: c('--accent'),
          700: c('--accent'),
        },

        /* --------------------------------------------------------- status */
        status: {
          low: c('--status-low'),
          'low-bg': c('--status-low-bg'),
          normal: c('--status-normal'),
          'normal-bg': c('--status-normal-bg'),
          high: c('--status-high'),
          'high-bg': c('--status-high-bg'),
          unknown: c('--status-unknown'),
          'unknown-bg': c('--status-unknown-bg'),
          conflict: c('--status-conflict'),
          'conflict-bg': c('--status-conflict-bg'),
        },

        /* ----------------------------------------------------- provenance */
        prov: {
          user: c('--prov-user'),
          'user-bg': c('--prov-user-bg'),
          doc: c('--prov-doc'),
          'doc-bg': c('--prov-doc-bg'),
          ai: c('--prov-ai'),
          'ai-bg': c('--prov-ai-bg'),
          verified: c('--prov-verified'),
          'verified-bg': c('--prov-verified-bg'),
          conflict: c('--prov-conflict'),
          'conflict-bg': c('--prov-conflict-bg'),
        },

        /* ------------------------------ DEPRECATED compatibility aliases  */
        ink: {
          DEFAULT: c('--ink'),
          50: c('--canvas'),
          100: c('--sunken'),
          200: c('--border'),
          300: '#CBD1DA',
          400: c('--faint'),
          500: c('--muted'),
          600: c('--secondary'),
          700: '#4A5261',
          800: '#2A313B',
          900: c('--ink'),
        },
        primary: {
          50: c('--accent-soft'),
          100: '#D6E2FD',
          200: '#B3C9FA',
          300: '#7FA3F4',
          400: '#4B7DEC',
          500: '#2A67E4',
          600: c('--accent'),
          700: '#164FBB',
          800: '#143F93',
          900: '#12306E',
        },
        vital: {
          50: c('--status-high-bg'),
          400: c('--status-high'),
          500: c('--status-high'),
          600: c('--status-high'),
        },
      },

      fontFamily: {
        sans: ['"Geist Variable"', 'Geist', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      /* Radius scale — sm 8 / md 12 / lg 16 / xl 20 / card 20 / pill 999 */
      borderRadius: {
        sm: '8px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        card: '20px',
        pill: '999px',
      },

      /* The only two shadows that exist. `panel`/`lift` are deprecated aliases. */
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.06)',
        raised: '0 2px 4px rgba(16,24,40,.06), 0 12px 32px rgba(16,24,40,.10)',
        panel: '0 2px 4px rgba(16,24,40,.06), 0 12px 32px rgba(16,24,40,.10)',
        lift: '0 2px 4px rgba(16,24,40,.06), 0 12px 32px rgba(16,24,40,.10)',
      },

      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.55' } },
        sweep: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        'pulse-soft': 'pulse-soft 1.6s ease-in-out infinite',
        sweep: 'sweep 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
