/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dce6ff',
          200: '#b9ceff',
          300: '#84a8ff',
          400: '#4d7bff',
          500: '#1a4fff',
          600: '#0033e6',
          700: '#0029b8',
          800: '#002296',
          900: '#001f7a',
          950: '#00103d',
        },
        surface: {
          0:   '#ffffff',
          50:  '#f8f9fc',
          100: '#f0f2f8',
          200: '#e2e6f0',
          300: '#c8cfe0',
          800: '#1e2336',
          900: '#141828',
          950: '#0d1020',
        },
        accent: {
          amber: '#f59e0b',
          green: '#10b981',
          red:   '#ef4444',
          violet:'#8b5cf6',
        }
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.08)',
        'card-hover': '0 4px 8px rgba(0,0,0,.08), 0 12px 32px rgba(0,0,0,.12)',
        'glow': '0 0 32px rgba(26,79,255,.25)',
      },
      borderRadius: {
        'xl2': '1.25rem',
      },
      animation: {
        'fade-in': 'fadeIn .4s ease both',
        'slide-up': 'slideUp .4s cubic-bezier(.16,1,.3,1) both',
        'shimmer': 'shimmer 1.4s infinite linear',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },             to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
}
