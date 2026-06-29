type EnvLike = Record<string, string | undefined>;

const clean = (value: string | undefined): string => value?.trim() ?? "";

export function resolveFirebaseProjectId(env: EnvLike = process.env): string {
  return (
    clean(env.FIREBASE_PROJECT_ID) ||
    clean(env.VITE_FIREBASE_PROJECT_ID) ||
    clean(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
  );
}

export function buildApiStartupChecks(env: EnvLike, clientId: string) {
  return {
    required: [
      {
        key: resolveFirebaseProjectId(env),
        label: "FIREBASE_PROJECT_ID / VITE_FIREBASE_PROJECT_ID",
        feature: "Firestore access (tenant config, kill-switch)",
      },
      {
        key: clean(clientId),
        label: "CLIENT_ID / VITE_CLIENT_ID",
        feature: "Tenant scoping",
      },
    ],
    optional: [
      {
        key: clean(env.GEMINI_API_KEY),
        label: "GEMINI_API_KEY",
        feature: "AI chat & style consultation",
      },
      {
        key: clean(env.STRIPE_SECRET_KEY),
        label: "STRIPE_SECRET_KEY",
        feature: "Stripe payments",
      },
      {
        key: clean(env.STRIPE_WEBHOOK_SECRET),
        label: "STRIPE_WEBHOOK_SECRET",
        feature: "Stripe webhook verification",
      },
      {
        key: clean(env.VITE_STRIPE_PUBLISHABLE_KEY),
        label: "VITE_STRIPE_PUBLISHABLE_KEY",
        feature: "Stripe frontend",
      },
      {
        key: clean(env.EMAIL_PROVIDER_API_KEY),
        label: "EMAIL_PROVIDER_API_KEY",
        feature: "Email notifications (Resend)",
      },
      {
        key: clean(env.BUSINESS_OWNER_EMAIL),
        label: "BUSINESS_OWNER_EMAIL",
        feature: "Notification recipient",
      },
      {
        key: clean(env.VITE_ADMIN_EMAIL),
        label: "VITE_ADMIN_EMAIL",
        feature: "Admin panel access",
      },
    ],
  };
}
