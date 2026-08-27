import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: true,

  routeRules: {
    // Public marketing page → static HTML at build time, edge-cached, real SEO.
    '/': { prerender: true },
    // Everything behind auth → client-only SPA; per-user data never renders on
    // the server and these pages have no SEO value.
    '/dashboard/**': { ssr: false },
    '/login': { ssr: false },
    '/sign-up/**': { ssr: false },
    '/sso-callback': { ssr: false },
  },

  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/eslint',
    '@clerk/nuxt',
    'shadcn-nuxt',
    '@nuxt/fonts',
    '@vueuse/nuxt',
    'nitro-cloudflare-dev',
  ],

  eslint: {
    config: {
      standalone: false,
    },
  },

  css: ['~/assets/css/tailwind.css'],

  fonts: {
    families: [
      { name: 'Hanken Grotesk', provider: 'google', weights: [400, 500, 600, 700] },
      { name: 'Newsreader', provider: 'google', weights: [400, 500, 600, 700], styles: ['normal', 'italic'] },
    ],
  },

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  shadcn: {
    prefix: '',
    componentDir: '@/components/ui',
  },

  runtimeConfig: {
    clerk: {
      secretKey: '',
    },
    public: {
      clerk: {
        publishableKey: '',
      },
      // Origin that serves R2 objects. Blank locally, so images fall back to
      // the /api/media/<key> worker route reading Miniflare's on-disk R2. In
      // production this is the bucket's custom domain, so images come straight
      // from the edge and never invoke the worker.
      mediaBaseUrl: '',
    },
  },

  typescript: {
    // The recipe-import unit tests sit beside the module they cover, and the
    // generated shared tsconfig is written with `types: []`, so `bun:test`
    // would be unresolved under `bun run tsc`. Run `bun run postinstall` after
    // editing this to regenerate .nuxt/tsconfig.shared.json.
    sharedTsConfig: {
      compilerOptions: {
        types: ['bun'],
      },
    },
  },

  nitro: {
    preset: 'cloudflare_module',

    typescript: {
      tsConfig: {
        // `wrangler types` writes the binding globals (R2Bucket, Hyperdrive, …)
        // to worker-configuration.d.ts at the repo root. Nuxt's app and shared
        // tsconfigs pick root `*.d.ts` up automatically, but the server one
        // includes only server/**/*, so server code needs this added by hand.
        // Regenerate with `bun run cf-typegen` after editing wrangler.jsonc.
        include: ['../worker-configuration.d.ts'],
      },
    },

    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
    },

    rollupConfig: {
      external: ['pg-native', 'cloudflare:sockets'],
    },
  },
})
