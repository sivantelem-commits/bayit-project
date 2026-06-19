/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-heebo)', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f0f9f4',
          100: '#dcf0e5',
          200: '#bbe2ce',
          300: '#8ecbad',
          400: '#5bae87',
          500: '#389168',
          600: '#277252',
          700: '#1f5c42',
          800: '#1b4935',
          900: '#173c2c',
          950: '#0c2119',
        },
        sand: {
          50:  '#faf8f4',
          100: '#f3ede2',
          200: '#e8dbc6',
          300: '#d9c3a1',
          400: '#c8a478',
          500: '#bc8d5a',
          600: '#ae7a4c',
          700: '#916340',
          800: '#755138',
          900: '#5f4330',
        },
      },
    },
  },
  plugins: [],
};
