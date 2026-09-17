import type { Express, Request, Response } from "express";
import { applyTagsPatch, isValidStage, validateTagsPatch } from "../customer-pipeline.js";
import { contactFacadeMode } from "./crm-core-legacy.js";
import type { ContactRegistration } from "./crm-core-handler.js";
import { executeContact, readCanonicalContact, readContact } from "./crm-core-service.js";
import { ContactError, type ContactActor } from "./crm-core-types.js";

type RouteAuth = { issuer?: string; uid: string; email: string };

// Firestore se inyecta para que ambos runtimes conserven su carga diferida.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Persistence = { db: any; FieldValue: any };

export type CustomerContactRouteDependencies = {
  clientId: string;
  requireAdminAuth: (req: Request, res: Response) => Promise<RouteAuth | null>;
  loadPersistence: () => Promise<Persistence | null>;
  contactRegistration: () => ContactRegistration | undefined;
};

export function registerCustomerContactRoutes(
  app: Express,
  dependencies: CustomerContactRouteDependencies,
): void {
  const { clientId, requireAdminAuth, loadPersistence, contactRegistration } = dependencies;

  app.patch("/api/customers/:customerId/stage", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      const customerId = String(req.params.customerId ?? "").trim();
      if (!customerId) return res.status(400).json({ error: "customerId is required" });
      const stage = req.body?.stage;
      if (!isValidStage(stage)) {
        return res.status(400).json({ error: "stage must be one of lead, contacted, scheduled, converted, lost" });
      }
      const persistence = await loadPersistence();
      if (!persistence) return res.status(503).json({ error: "Database not available" });
      const { db, FieldValue } = persistence;
      const mode = await contactFacadeMode(db, clientId, contactRegistration());
      if (mode.kind === "core") {
        if (!auth.issuer) return res.status(403).json({ error: "contact_identity_invalid" });
        const actor: ContactActor = { issuer: auth.issuer, uid: auth.uid, email: auth.email };
        const current = customerId.startsWith("c2_")
          ? await readContact(mode.registration.context, actor, customerId)
          : await readCanonicalContact(mode.registration.context, actor, customerId);
        const result = await executeContact(mode.registration.context, actor, {
          operationId: req.body?.operationId,
          action: "update",
          key: current.key,
          expectedRevision: req.body?.expectedRevision,
          expectedVersion: req.body?.expectedVersion,
          fields: { stage },
          reason: "Actualización de etapa desde CRM",
        });
        return res.json({ ok: true, stage, contact: result });
      }

      const ref = db.collection("customers").doc(customerId);
      const result = await db.runTransaction(async (tx: Persistence["db"]) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return { status: 404, body: { error: "Customer not found" } };
        const data = snap.data() ?? {};
        if (data.clientId !== clientId) return { status: 403, body: { error: "Tenant mismatch on customer document" } };
        const previousStage = typeof data.stage === "string" ? data.stage : null;
        if (previousStage === stage) return { status: 200, body: { ok: true, stage, unchanged: true } };
        tx.update(ref, { stage, updatedAt: FieldValue.serverTimestamp() });
        tx.create(db.collection("hub_status_history").doc(), {
          clientId,
          kind: "customer_stage_change",
          customerId,
          from: previousStage,
          to: stage,
          actor: auth.email,
          source: "crm_admin",
          createdAt: FieldValue.serverTimestamp(),
        });
        return { status: 200, body: { ok: true, stage, from: previousStage } };
      });
      return res.status(result.status).json(result.body);
    } catch (error) {
      if (error instanceof ContactError) return res.status(error.status).json({ error: error.code });
      console.error("[Customer Stage] update failed:", error);
      return res.status(500).json({ error: "Failed to update stage" });
    }
  });

  app.patch("/api/customers/:customerId/tags", async (req, res) => {
    const auth = await requireAdminAuth(req, res);
    if (!auth) return;
    try {
      const customerId = String(req.params.customerId ?? "").trim();
      if (!customerId) return res.status(400).json({ error: "customerId is required" });
      const parsed = validateTagsPatch(req.body);
      if (parsed.ok !== true) return res.status(400).json({ error: parsed.error });
      const persistence = await loadPersistence();
      if (!persistence) return res.status(503).json({ error: "Database not available" });
      const { db, FieldValue } = persistence;
      const mode = await contactFacadeMode(db, clientId, contactRegistration());
      if (mode.kind === "core") {
        if (!auth.issuer) return res.status(403).json({ error: "contact_identity_invalid" });
        const actor: ContactActor = { issuer: auth.issuer, uid: auth.uid, email: auth.email };
        const current = customerId.startsWith("c2_")
          ? await readContact(mode.registration.context, actor, customerId)
          : await readCanonicalContact(mode.registration.context, actor, customerId);
        const existing = current.tags ?? [];
        const merged = applyTagsPatch(existing, parsed).filter((tag) => !parsed.remove.includes(tag));
        const result = await executeContact(mode.registration.context, actor, {
          operationId: req.body?.operationId,
          action: "update",
          key: current.key,
          expectedRevision: req.body?.expectedRevision,
          expectedVersion: req.body?.expectedVersion,
          fields: { tags: merged },
          reason: "Actualización de etiquetas desde CRM",
        });
        return res.json({ ok: true, tags: merged, contact: result });
      }

      const ref = db.collection("customers").doc(customerId);
      const result = await db.runTransaction(async (tx: Persistence["db"]) => {
        const snap = await tx.get(ref);
        if (!snap.exists) return { status: 404, body: { error: "Customer not found" } };
        const data = snap.data() ?? {};
        if (data.clientId !== clientId) return { status: 403, body: { error: "Tenant mismatch on customer document" } };
        const existing: string[] = Array.isArray(data.tags)
          ? data.tags.filter((tag: unknown): tag is string => typeof tag === "string")
          : [];
        const merged = applyTagsPatch(existing, parsed).filter((tag) => !parsed.remove.includes(tag));
        tx.update(ref, { tags: merged, updatedAt: FieldValue.serverTimestamp() });
        return { status: 200, body: { ok: true, tags: merged } };
      });
      return res.status(result.status).json(result.body);
    } catch (error) {
      if (error instanceof ContactError) return res.status(error.status).json({ error: error.code });
      console.error("[Customer Tags] update failed:", error);
      return res.status(500).json({ error: "Failed to update tags" });
    }
  });
}
