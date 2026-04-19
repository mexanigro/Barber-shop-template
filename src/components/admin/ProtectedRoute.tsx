import React from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { isAdminUser } from "../../lib/admin-auth";
import { UnauthorizedAdmin } from "./UnauthorizedAdmin";
import { AdminLoginPanel } from "./AdminLoginPanel";

type Props = {
  children: React.ReactNode;
  /** Navigate away from admin (e.g. back to public site) */
  onExit: () => void;
};

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background transition-colors duration-300">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent-light border-t-transparent" />
    </div>
  );
}

/**
 * Bunker gate: Firebase session required + email must match siteConfig.adminEmail.
 */
export function ProtectedRoute({ children, onExit }: Props) {
  const [user, setUser] = React.useState<User | null>(() => auth.currentUser);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    onExit();
  };

  if (loading) {
    return <AuthLoading />;
  }

  if (!user) {
    return <AdminLoginPanel onExit={onExit} />;
  }

  if (!isAdminUser(user)) {
    return <UnauthorizedAdmin email={user.email} onSignOut={handleSignOut} />;
  }

  return <>{children}</>;
}
