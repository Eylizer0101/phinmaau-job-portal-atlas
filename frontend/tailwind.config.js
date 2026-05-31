/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'job-yellow': '#F1C40F',
        'job-green': '#27AE60',
        'job-black': '#000000',
        'job-white': '#FFFFFF',
        'job-gray': '#F5F5F5',
      },
    },
  },
  plugins: [],
}