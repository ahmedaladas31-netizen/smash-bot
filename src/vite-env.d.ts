/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_WEBHOOK_URL: string
  readonly VITE_WEBHOOK_TOKEN: string
  readonly VITE_DASHBOARD_PASSWORD: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
