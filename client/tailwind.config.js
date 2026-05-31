import plugin from 'tailwindcss/plugin';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef3e2',
          100: '#fde4c3',
          200: '#fcd19f',
          300: '#fbbf7c',
          400: '#f9a13e',
          500: '#f7931e',
          600: '#e07a0e',
          700: '#b85f0b',
          800: '#944b0c',
          900: '#773b10',
        },
        kid: {
          blue: '#60A5FA',
          green: '#34D399',
          pink: '#F472B6',
          yellow: '#FBBF24',
          purple: '#A78BFA',
        },
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      fontFamily: {
        kid: ['"Comic Sans MS"', '"PingFang SC"', 'cursive', 'sans-serif'],
      },
    },
  },
  plugins: [
    plugin(function({ addVariant }) {
      addVariant('landscape', '@media (orientation: landscape) and (max-height: 500px)');
    }),
  ],
};