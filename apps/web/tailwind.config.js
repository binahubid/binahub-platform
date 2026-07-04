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
        }
      }
    }
  },
  plugins: []
};
