import React from "react";
import { ShieldOff } from "lucide-react";
import { motion } from "motion/react";

type Props = {
  /** Signed-in email (optional display for support context) */
  email?: string | null;
  onSignOut: () => void | Promise<void>;
};

export function UnauthorizedAdmin({ email, onSignOut }: Props) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 text-center transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md space-y-8"
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10">
          <ShieldOff className="text-red-500" size={40} strokeWidth={1.5} />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-black uppercase tracking-tight text-foreground md:text-3xl">
            Access denied
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            You signed in successfully, but this account is not authorized for the owner
            console. Only the configured administrator email can open this panel.
          </p>
          {email ? (
            <p className="font-mono text-xs text-muted-foreground/80">
              Signed in as <span className="text-foreground">{email}</span>
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => void onSignOut()}
          className="w-full rounded-2xl bg-primary px-8 py-4 text-sm font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-accent/25 transition-all duration-300 hover:bg-accent-light hover:text-zinc-950"
        >
          Cerrar sesión
        </button>
      </motion.div>
    </div>
  );
}
