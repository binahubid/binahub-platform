/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        binahub: {
          primary: '#0B2C6B',
          secondary: '#D9A441',
          accent: '#16A34A',
          dark: '#0A255A',
          light: '#F5F7FA'
        },
        // Semantic aliases (prefer these in new code). Values mirror binahub.* / slate scale.
        brand: {
          DEFAULT: '#0B2C6B',
          dark: '#0A255A',
          darker: '#071A33',
          light: '#1e40af',
          soft: '#eff4ff',
          ring: 'rgba(11, 44, 107, 0.20)'
        },
        gold: {
          DEFAULT: '#D9A441',
          light: '#f59e0b'
        },
        surface: {
          DEFAULT: '#ffffff',
          subtle: '#f8fafc',
          muted: '#f1f5f9'
        }
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)',
        'card-hover': '0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -2px rgba(15, 23, 42, 0.06)',
        soft: '0 2px 8px -2px rgba(15, 23, 42, 0.08)'
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1rem'
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)'
      }
    }
  },
  plugins: []
};
