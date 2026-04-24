import React from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { isAdminUser } from "../lib/admin-auth";

/** Live Firebase session + strict admin email match for UI affordances (e.g. footer link). */
export function useAdminAccess() {
  const [user, setUser] = React.useState<User | null>(() => auth.currentUser);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const isAdmin = React.useMemo(() => isAdminUser(user), [user]);

  return { user, loading, isAdmin };
}
