/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/**/*.{js,ts,jsx,tsx,vue}', // Ajusta esto si tienes otras extensiones de archivo
  ],
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: [
      {
        dark: {
          "primary": "#989898",
          "primary-focus": "#4506cb",
          "primary-content": "#ffffff",
          "secondary": "#f000b8",
          "secondary-focus": "#bd0091",
          "secondary-content": "#ffffff",
          "accent": "#37cdbe",
          "accent-focus": "#2aa79b",
          "accent-content": "#ffffff",
          "neutral": "#3d4451",
          "neutral-focus": "#2a2e37",
          "neutral-content": "#ffffff",
          "base-100": "#10100E",
          "base-200": "#282825",
          "base-300": "#080807",
          "base-content": "#E1D5CD",
          "info": "#2094f3",
          "warning": "#ff9900",
          "fontFamily": {
            'body': ['Poppins', 'sans-serif'],
            'display': ['Satoshi', 'sans-serif'],
          }
        },
      },
      // otros temas que desees mantener
      'light',
    ],
  },
}
