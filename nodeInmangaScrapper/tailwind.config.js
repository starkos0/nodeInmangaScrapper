/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/**/*.{js,ts,jsx,tsx,vue}', // Ajusta esto si tienes otras extensiones de archivo
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('daisyui'),
  ],
}
