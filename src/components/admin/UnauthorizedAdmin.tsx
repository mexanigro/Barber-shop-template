// CRM-03 · diseño (clon de diseño): una cuenta que entró pero no tiene acceso. Con D-305 entran la dueña y quienes ella invitó
// (empleada o gerente): el texto dice eso y qué hacer — pedir la invitación a esta dirección o entrar con otra cuenta.
import React from "react";
import { ShieldOff } from "lucide-react";
import { localeConfig } from "../../config/locale";

type Props = {
  email?: string | null;
  onSignOut: () => void | Promise<void>;
};

export function UnauthorizedAdmin({ email, onSignOut }: Props) {
  const t = localeConfig.admin.auth;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-5 text-center">
        <span aria-hidden className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-foreground"><ShieldOff size={30} strokeWidth={1.75} /></span>
        <h1 className="text-2xl font-bold text-foreground">{t.accessDenied}</h1>
        <p className="text-base text-muted-foreground">נכנסים רק הבעלים ומי שהבעלים הזמינה. אם את מהצוות, בקשי הזמנה לכתובת הזאת — או היכנסי עם החשבון שהוזמן.</p>
        {email && <p className="rounded-xl bg-muted px-3 py-2 text-sm text-foreground">{t.signedInAs} <span dir="ltr" className="font-semibold">{email}</span></p>}
        <button type="button" onClick={() => void onSignOut()} className="h-12 w-full rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground">
          כניסה עם חשבון אחר
        </button>
      </div>
    </main>
  );
}
