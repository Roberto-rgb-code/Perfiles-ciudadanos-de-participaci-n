/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          900: '#4b1c71',
          700: '#7f4ca5',
          500: '#b57edc',
          300: '#dbb6ee',
          50: '#fff0ff',
        },
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 8px 28px rgba(75, 28, 113, 0.10)',
        soft: '0 2px 12px rgba(75, 28, 113, 0.08)',
      },
      borderRadius: {
        '2.5xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
