export default defineNuxtConfig({
  buildDir: process.env.NUXT_BUILD_DIR || (process.env.VERCEL ? '.nuxt-vercel' : '.nuxt'),
  css: ['~/src/index.css'],
  compatibilityDate: '2026-05-17',
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  nitro: {
    preset: process.env.VERCEL ? 'vercel' : 'node-server',
  },
})
