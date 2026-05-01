/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        moa: {
          text: '#222222',
          sub: '#888888',
          placeholder: '#CCCCCC',
          muted: '#AAAAAA',
          border: '#F0F0F0',
          bg: '#FAFAFA',
        },
      },
    },
  },
  plugins: [],
};
