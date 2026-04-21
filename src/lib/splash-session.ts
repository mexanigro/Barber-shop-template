/**
 * splash-session.ts
 *
 * Module-level singleton that tracks whether the intro splash has already been
 * shown in this browser load. Lives for the lifetime of the JS module (i.e. a
 * hard refresh resets it, SPA navigation does NOT).
 *
 * Usage in App.tsx:
 *   import { splashSession } from './lib/splash-session';
 *   // Show splash only if not yet dismissed:
 *   const [showSplash, setShowSplash] = useState(!splashSession.dismissed);
 *   // After exit animation completes:
 *   <AnimatePresence onExitComplete={() => splashSession.dismiss()} />
 */
export const splashSession = {
  dismissed: false,
  dismiss() {
    this.dismissed = true;
  },
};
