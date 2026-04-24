import { doc, getDoc } from "firebase/firestore";
import { env } from "../config/env";
import { applyTenantConfigOverride } from "../config/site";
import type { ClientStatus } from "../config/tenant";
import { db, isFirebaseConfigured } from "../lib/firebase";

type ClientDoc = {
  status?: ClientStatus;
  legalName?: string;
  timezone?: string;
  allowedPaymentProviders?: string[];
};

type TenantConfigDoc = Record<string, unknown>;

export type TenantBootstrapResult = {
  clientId: string;
  status: ClientStatus;
  suspended: boolean;
};

export async function bootstrapTenantConfig(): Promise<TenantBootstrapResult> {
  const clientId = env.clientId;

  if (!isFirebaseConfigured) {
    console.warn("[Tenant] Firebase not configured. Using static template config.");
    return { clientId, status: "active", suspended: false };
  }

  try {
    const [clientSnap, configSnap] = await Promise.all([
      getDoc(doc(db, "clients", clientId)),
      getDoc(doc(db, "config", clientId)),
    ]);

    const clientData = (clientSnap.exists() ? (clientSnap.data() as ClientDoc) : {}) ?? {};
    const status = (clientData.status ?? "active") as ClientStatus;

    if (configSnap.exists()) {
      applyTenantConfigOverride(configSnap.data() as TenantConfigDoc);
    }

    return {
      clientId,
      status,
      suspended: status === "suspended" || status === "archived",
    };
  } catch (error) {
    console.error("[Tenant] Failed to load tenant config. Falling back to base preset.", error);
    return { clientId, status: "active", suspended: false };
  }
}
