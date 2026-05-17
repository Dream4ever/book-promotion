/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app.vue', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        sand: {
          50: '#f8f4ec',
          100: '#efe5d2',
          200: '#e5d2b0',
          300: '#d6ba87',
          400: '#c89b5b',
          500: '#b67c3a',
          600: '#945f27',
          700: '#72471d',
          800: '#4f3217',
          900: '#2c1b0f'
        },
        pine: {
          500: '#2d5f4d',
          600: '#214b3c',
          700: '#19392e'
        }
      },
      boxShadow: {
        panel: '0 20px 60px rgba(56, 34, 12, 0.12)'
      },
      fontFamily: {
        sans: ['"IBM Plex Sans SC"', '"Microsoft YaHei"', 'sans-serif']
      }
    }
  },
  plugins: []
}
