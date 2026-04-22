/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UI_LANGUAGE?: string;
  readonly VITE_ADMIN_EMAIL?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
