/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        solar: {
          50: '#F2F8F4',
          100: '#DFEFE5',
          200: '#BFDFC9',
          300: '#96CCA6',
          400: '#4CA46D',
          500: '#1F6F43', // Brand Solar Green
          600: '#1A5D38', // Active Green (matches Dashboard active state)
          700: '#154B2D', // Deep Forest Green Hover
          800: '#113A23',
          900: '#0C2A19',
          950: '#06170D',
        },
        dealer: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F9AA0A', // Brand Sun Gold & Lightning
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        navy: {
          500: '#046BC2',
          600: '#0A3F82',
          700: '#072F66',
          800: '#022054',
          900: '#011538',
        },
        energy: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          500: '#23A11B', // Brand Green Swoosh (from J.I mark)
          600: '#16A34A',
          700: '#15803D',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
