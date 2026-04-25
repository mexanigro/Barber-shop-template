import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

initializeApp();

function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_BOOTSTRAP_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function isValidClientId(clientId: unknown): clientId is string {
  return typeof clientId === "string" && /^client_[a-z0-9_]{3,64}$/i.test(clientId);
}

function isValidRole(role: unknown): role is "owner" | "manager" | "staff" {
  return role === "owner" || role === "manager" || role === "staff";
}

function normalizeBearer(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return match?.[1] ?? null;
}

export const setTenantClaim = onRequest(
  { region: "us-central1", cors: true, timeoutSeconds: 60, invoker: "public" },
  async (req: any, res: any) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed. Use POST." });
      return;
    }

    const bearer = normalizeBearer(req.header("authorization"));
    if (!bearer) {
      res.status(401).json({ error: "Missing bearer token." });
      return;
    }

    const auth = getAuth();

    let caller;
    try {
      caller = await auth.verifyIdToken(bearer, true);
    } catch (error) {
      logger.warn("Invalid caller token", error);
      res.status(401).json({ error: "Invalid auth token." });
      return;
    }

    const callerEmail = String(caller.email ?? "").toLowerCase();
    const adminEmails = parseAdminEmails();
    if (!callerEmail || !adminEmails.includes(callerEmail)) {
      res.status(403).json({ error: "Caller is not authorized to assign claims." });
      return;
    }

    const body = (req.body ?? {}) as {
      uid?: string;
      email?: string;
      clientId?: string;
      role?: "owner" | "manager" | "staff";
    };

    if (!isValidClientId(body.clientId)) {
      res.status(400).json({ error: "Invalid clientId format. Expected: client_xxx" });
      return;
    }

    const tenantRole = isValidRole(body.role) ? body.role : "owner";

    let targetUid = body.uid?.trim() ?? "";
    if (!targetUid) {
      const email = body.email?.trim().toLowerCase();
      if (!email) {
        res.status(400).json({ error: "Provide uid or email." });
        return;
      }
      try {
        const targetUser = await auth.getUserByEmail(email);
        targetUid = targetUser.uid;
      } catch (error) {
        logger.warn("Target user not found by email", error);
        res.status(404).json({ error: "Target user not found." });
        return;
      }
    }

    try {
      const user = await auth.getUser(targetUid);
      const currentClaims = (user.customClaims ?? {}) as Record<string, unknown>;
      const nextClaims = {
        ...currentClaims,
        clientId: body.clientId,
        tenantRole,
      };

      await auth.setCustomUserClaims(targetUid, nextClaims);
      await auth.revokeRefreshTokens(targetUid);

      res.json({
        ok: true,
        uid: targetUid,
        clientId: body.clientId,
        tenantRole,
      });
    } catch (error) {
      logger.error("Failed to set tenant claim", error);
      res.status(500).json({ error: "Failed to set custom claims." });
    }
  },
);
