/// <reference types="vite/client" />

declare module "react-dom/client" {
  import { Container } from "react-dom";
  import { ReactNode } from "react";
  interface Root {
    render(children: ReactNode): void;
    unmount(): void;
  }
  function createRoot(container: Container): Root;
  function hydrateRoot(container: Container, initialChildren: ReactNode): Root;
}

interface ImportMetaEnv {
  readonly VITE_ACTIVE_NICHE?: string;
  readonly VITE_UI_LANGUAGE?: string;
  readonly VITE_ADMIN_EMAIL?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_CLIENT_ID?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_FIREBASE_DATABASE_ID?: string;
  readonly NEXT_PUBLIC_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
