/** @type {import("prettier").Config} */
module.exports = {
  ...require('@buildigo/prettier-config'),
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/static/styles/main.css',
}
