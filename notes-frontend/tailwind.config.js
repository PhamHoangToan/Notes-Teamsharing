/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './src/lib/**/*.{svelte,ts}',
    './src/routes/**/*.{svelte,ts}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb', // màu xanh dương chủ đạo
        secondary: '#9333ea', // tím nhẹ
        grayLight: '#f9fafb',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.gray.800'),
            a: {
              color: theme('colors.blue.600'),
              '&:hover': {
                color: theme('colors.blue.800'),
              },
            },
            h1: { fontWeight: '700' },
            h2: { fontWeight: '600' },
            code: {
              backgroundColor: theme('colors.gray.100'),
              padding: '0.2em 0.4em',
              borderRadius: '4px',
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'), //  Hỗ trợ prose cho TipTap
    require('@tailwindcss/forms'), //  Tối ưu input/textarea
  ],
  darkMode: 'class', // 🌓 hỗ trợ dark mode nếu cần
};
