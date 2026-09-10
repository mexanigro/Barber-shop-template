import type { Request, Response } from "express";
import type { Firestore } from "firebase-admin/firestore";
import type { PaymentProvider, ServerPaymentGateway } from "./payment-gateways";

type CheckoutDependencies = {
  getAdminDb: () => Promise<Firestore | null>;
  getClientRuntimeState: () => Promise<{ provider: PaymentProvider }>;
  resolvePaymentGateway: (provider: PaymentProvider) => Promise<ServerPaymentGateway>;
  sanitizeText: (input: unknown, maxLen: number) => string;
  isValidEmail: (value: string) => boolean;
  clientId: string;
  getBaseUrl: () => string;
};

/** Checkout compartido: el importe procede de la cita, nunca del visitante. */
export function createCheckoutHandler(deps: CheckoutDependencies) {
  const { getAdminDb, getClientRuntimeState, resolvePaymentGateway, sanitizeText, isValidEmail, clientId: CLIENT_ID, getBaseUrl } = deps;
  return async (req: Request, res: Response) => {
    try {
      const appointmentId = sanitizeText(req.body?.appointmentId, 120);
      const name = sanitizeText(req.body?.name, 160);
      const customerEmail = sanitizeText(req.body?.customerEmail, 200).toLowerCase();

      if (!appointmentId || !name || !customerEmail) {
        return res.status(400).json({ error: "Invalid checkout payload." });
      }
      if (!isValidEmail(customerEmail)) {
        return res.status(400).json({ error: "Invalid customer email." });
      }

      const db = await getAdminDb();
      if (!db) {
        return res.status(503).json({ error: "Database not available." });
      }

      const apptSnap = await db.collection("appointments").doc(appointmentId).get();
      if (!apptSnap.exists) {
        return res.status(404).json({ error: "Appointment not found." });
      }
      const apptData = apptSnap.data()!;
      if (apptData.clientId && apptData.clientId !== CLIENT_ID) {
        return res.status(403).json({ error: "Appointment does not belong to this tenant." });
      }

      let authorizedPrice: number | null = null;
      if (typeof apptData.priceCents === "number" && apptData.priceCents > 0) {
        authorizedPrice = apptData.priceCents;
      } else if (typeof apptData.price === "number" && apptData.price > 0) {
        authorizedPrice = Math.round(apptData.price * 100);
      }

      if (!authorizedPrice || !Number.isInteger(authorizedPrice) || authorizedPrice < 50 || authorizedPrice > 2_000_000) {
        return res.status(400).json({ error: "No valid price found for this appointment. Set the price in the CRM before accepting payment." });
      }

      const { provider } = await getClientRuntimeState();
      if (provider === "none") {
        return res.status(400).json({ error: "No online payment provider configured for this client." });
      }

      // Cardcom permanece no operativo hasta demostrar el mapeo de moneda del tenant.
      if (provider === "cardcom") {
        return res.status(503).json({ error: "Cardcom currency mapping is not verified. Checkout disabled." });
      }

      const configSnap = await db.collection("config").doc(CLIENT_ID).get();
      const payment = configSnap.exists ? configSnap.data()?.payment : undefined;
      const mode = payment?.mode;
      if (mode !== "deposit" && mode !== "full") {
        return res.status(503).json({ error: "Online payment mode not configured." });
      }
      let amountCents = authorizedPrice;
      if (mode === "deposit") {
        const deposit = payment?.depositAmount;
        if (!Number.isInteger(deposit) || deposit < 50 || deposit > authorizedPrice) {
          return res.status(503).json({ error: "Payment deposit not configured." });
        }
        amountCents = deposit;
      }

      // La moneda Stripe procede exclusivamente de la configuración del tenant.
      let currency: "ils" | "usd" | "eur" | undefined;
      if (provider === "stripe") {
        const rawCurrency = payment?.currency;
        if (rawCurrency !== "ILS" && rawCurrency !== "USD" && rawCurrency !== "EUR") {
          return res.status(503).json({ error: "Payment currency not configured." });
        }
        currency = rawCurrency.toLowerCase() as "ils" | "usd" | "eur";
      }

      let gateway: ServerPaymentGateway;
      try {
        gateway = await resolvePaymentGateway(provider);
      } catch (err) {
        console.warn(`[Checkout] Failed to resolve gateway "${provider}":`, err instanceof Error ? err.message : err);
        return res.status(503).json({ error: "Payment service not configured." });
      }

      const baseUrl = getBaseUrl();
      const result = await gateway.createCheckoutSession({
        appointmentId,
        customerEmail,
        serviceName: name,
        amountCents,
        currency,
        mode,
        successUrl: `${baseUrl}/?booking_status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/?booking_status=cancelled`,
        clientId: CLIENT_ID,
      });

      res.json({ id: result.sessionId, url: result.redirectUrl });
    } catch (error: unknown) {
      // M-12 FIX: Never leak Stripe/payment error details to the client.
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session." });
    }
  };
}
