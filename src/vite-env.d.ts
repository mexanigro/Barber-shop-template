/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UI_LANGUAGE?: string;
  readonly VITE_ADMIN_EMAIL?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_CLIENT_ID?: string;
  readonly NEXT_PUBLIC_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
