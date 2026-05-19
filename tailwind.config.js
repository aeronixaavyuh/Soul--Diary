/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Soul Diary Brand Colors
        soul: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d6fe',
          300: '#a5b8fc',
          400: '#8191f8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        // Dark theme background shades
        dark: {
          50:  '#f8fafc',
          100: '#1e1e2e',
          200: '#181825',
          300: '#13131f',
          400: '#0f0f1a',
          500: '#0a0a14',
        },
        // Accent colors
        accent: {
          pink:   '#f472b6',
          purple: '#a78bfa',
          blue:   '#60a5fa',
          green:  '#34d399',
          yellow: '#fbbf24',
          orange: '#fb923c',
        }
      },
      fontFamily: {
        sans:    ['Outfit', 'system-ui', 'sans-serif'],
        serif:   ['Lora', 'Georgia', 'serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        display: ['Playfair Display', 'serif'],
      },
      borderRadius: {
        'xl':  '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'glow-sm':  '0 0 10px rgba(99,102,241,0.3)',
        'glow':     '0 0 20px rgba(99,102,241,0.4)',
        'glow-lg':  '0 0 40px rgba(99,102,241,0.5)',
        'inner-glow': 'inset 0 0 20px rgba(99,102,241,0.1)',
        'card':     '0 4px 24px rgba(0,0,0,0.15)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.25)',
      },
      animation: {
        'fade-in':       'fadeIn 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-right':'slideInRight 0.3s ease-out',
        'slide-up':      'slideUp 0.3s ease-out',
        'scale-in':      'scaleIn 0.2s ease-out',
        'float':         'float 3s ease-in-out infinite',
        'pulse-glow':    'pulseGlow 2s ease-in-out infinite',
        'shimmer':       'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInLeft: {
          '0%':   { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',     opacity: '1' },
        },
        slideInRight: {
          '0%':   { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        scaleIn: {
          '0%':   { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(99,102,241,0.3)' },
          '50%':      { boxShadow: '0 0 25px rgba(99,102,241,0.6)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      backdropBlur: {
        xs: '2px',
      }
    }
  },
  plugins: []
}