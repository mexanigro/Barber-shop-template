import React from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { verifyAdminUser } from "../lib/admin-auth";

/** Live Firebase session + strict admin email match for UI affordances (e.g. footer link). */
export function useAdminAccess() {
  const [user, setUser] = React.useState<User | null>(() => auth?.currentUser ?? null);
  const [loading, setLoading] = React.useState(true);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    setLoading(true);
    verifyAdminUser(user)
      .then((ok) => {
        if (!cancelled) setIsAdmin(ok);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { user, loading, isAdmin };
}
