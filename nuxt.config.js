export default defineNuxtConfig({
  buildDir: process.env.NUXT_BUILD_DIR || (process.env.VERCEL ? '.nuxt-vercel' : '.nuxt'),
  modules: ['@nuxt/ui'],
  css: ['~/src/index.css'],
  compatibilityDate: '2026-05-17',
  nitro: {
    preset: process.env.VERCEL ? 'vercel' : 'node-server',
  },
  ui: {
    fonts: false,
  },
})
