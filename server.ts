import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

// ─── Startup Diagnostics ──────────────────────────────────────────────────────
// Runs once at boot. Logs which integrations are active vs unconfigured so
// developers cloning the template immediately know what still needs setup.
function logStartupStatus() {
  const tag = "[Template Setup]";
  const checks = [
    { key: process.env.GEMINI_API_KEY,         label: "GEMINI_API_KEY",          feature: "AI chat & style consultation" },
    { key: process.env.STRIPE_SECRET_KEY,       label: "STRIPE_SECRET_KEY",       feature: "Stripe payments" },
    { key: process.env.STRIPE_WEBHOOK_SECRET,   label: "STRIPE_WEBHOOK_SECRET",   feature: "Stripe webhook verification" },
    { key: process.env.VITE_STRIPE_PUBLISHABLE_KEY, label: "VITE_STRIPE_PUBLISHABLE_KEY", feature: "Stripe frontend" },
    { key: process.env.EMAIL_PROVIDER_API_KEY,  label: "EMAIL_PROVIDER_API_KEY",  feature: "Email notifications (Resend)" },
    { key: process.env.BUSINESS_OWNER_EMAIL,    label: "BUSINESS_OWNER_EMAIL",    feature: "Notification recipient" },
    { key: process.env.VITE_ADMIN_EMAIL,        label: "VITE_ADMIN_EMAIL",        feature: "Admin panel access" },
  ];

  console.log(`\n${tag} ─── Service Configuration Status ───`);
  let allGood = true;
  for (const { key, label, feature } of checks) {
    if (key && key.trim() !== "") {
      console.log(`  ✓  ${label.padEnd(32)} → ${feature}`);
    } else {
      console.warn(`  ✗  ${label.padEnd(32)} → ${feature} (DISABLED — add key to .env)`);
      allGood = false;
    }
  }
  if (allGood) {
    console.log(`${tag} All integrations configured.\n`);
  } else {
    console.warn(`${tag} Some features are disabled. See above for missing keys.\n`);
  }
}

const GEMINI_REST_MODEL = "gemini-1.5-flash";
const GEMINI_REST_BASE = "https://generativelanguage.googleapis.com/v1beta";

type GeminiChatPart = { role: "user" | "model"; parts: { text: string }[] };

async function geminiGenerateContent(
  apiKey: string,
  opts: {
    contents: GeminiChatPart[];
    systemInstruction?: string;
    responseMimeType?: "application/json";
    temperature?: number;
  },
): Promise<string> {
  const url = `${GEMINI_REST_BASE}/models/${GEMINI_REST_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body: Record<string, unknown> = {
    contents: opts.contents,
    generationConfig: {
      ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
      ...(opts.responseMimeType ? { responseMimeType: opts.responseMimeType } : {}),
    },
  };
  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  if (!res.ok) {
    throw new Error(data?.error?.message ?? res.statusText);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text == null || text === "") {
    throw new Error("Empty response from model");
  }
  return text;
}

let stripeInstance: Stripe | null = null;
const getStripe = (): Stripe | null => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.trim() === "") {
    return null;
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(key, {
      apiVersion: "2026-03-25.dahlia" as any,
    });
  }
  return stripeInstance;
};

let resendInstance: Resend | null = null;
const getResend = () => {
  if (!resendInstance && process.env.EMAIL_PROVIDER_API_KEY) {
    resendInstance = new Resend(process.env.EMAIL_PROVIDER_API_KEY);
  }
  return resendInstance;
};

function buildStrategicAnalysisPrompt(
  appointments: unknown[],
  staff: { name?: string }[],
  services: { name?: string }[],
): string {
  return `
      You are the "Strategic AI Advisor" for a premium service business called "Sector Missions".
      Your goal is to analyze the current appointment data and provide 3-4 highly tactical, actionable insights for the business owner.
      
      DATA:
      - Total Appointments: ${appointments.length}
      - Personnel (Staff): ${staff.map((s) => s.name).join(", ")}
      - Services: ${services.map((s) => s.name).join(", ")}
      
      RECENT APPOINTMENTS:
      ${JSON.stringify(appointments.slice(0, 20), null, 2)}
      
      INSTRUCTIONS:
      1. Identify peak time clusters.
      2. Suggest schedule optimizations (e.g., "Shift resources to Tuesday afternoon").
      3. Identify popular services and suggest bundling or promotions.
      4. Note any gaps in the schedule.
      
      OUTPUT FORMAT:
      Return a JSON object with:
      {
        "status": "summary of current state",
        "insights": [
          { "title": "Short title", "description": "Tactical advice", "impact": "High/Medium/Low" }
        ],
        "tacticalMetric": "A percentage or number representing optimization"
      }
    `;
}

function buildStyleConsultationPrompt(userDescription: string, services: { name?: string; description?: string }[]): string {
  const safeQuote = JSON.stringify(userDescription ?? "");
  return `
      You are a world-class Style & Services Consultant.
      A customer is describing what they want: ${safeQuote}
      
      Our services: ${services.map((s) => `${s.name} (${s.description})`).join(" | ")}
      
      Suggest the best matching service and explain WHY in a brief, cool, "Mission Control" style tone.
      Limit response to 2 sentences.
      
      OUTPUT:
      {
        "serviceId": "id of the best service",
        "advice": "Cool tactical advice",
        "confidence": 0.95
      }
    `;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialized Notification Helpers
const sendNotification = async (subject: string, data: any, type: 'booking' | 'contact') => {
  // CONFIGURATION RECOVERY: These values should be provided via Environment Secrets
  const ownerEmail = process.env.BUSINESS_OWNER_EMAIL;
  const fromEmail = process.env.EMAIL_FROM_ADDRESS || "onboarding@resend.dev";
  const resend = getResend();

  const toEmail = type === 'booking' 
    ? (process.env.BOOKING_NOTIFICATION_EMAIL || ownerEmail)
    : (process.env.CONTACT_NOTIFICATION_EMAIL || ownerEmail);

  if (!toEmail) {
    console.error("[Notification Layer] CRITICAL: No recipient email configured. Please set BUSINESS_OWNER_EMAIL.");
    return { status: 'error', error: 'No recipient email' };
  }

  console.log(`[Notification Layer] Processing ${type} notification...`);
  
  let html = "";
  if (type === 'booking') {
    html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
        <h2 style="color: #f59e0b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 24px;">New Booking Request</h2>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <p><strong>Appointment ID:</strong> ${data.appointmentId || 'N/A'}</p>
          <p><strong>Staff:</strong> ${data.details?.staff || 'N/A'}</p>
          <p><strong>Service:</strong> ${data.details?.service || 'N/A'}</p>
          <p><strong>Date:</strong> ${data.details?.date || 'N/A'}</p>
          <p><strong>Time:</strong> ${data.details?.time || 'N/A'}</p>
        </div>
        <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h3 style="font-size: 14px; text-transform: uppercase; margin-bottom: 8px;">Customer Details</h3>
          <p style="margin: 4px 0;"><strong>Name:</strong> ${data.details?.customerName || 'N/A'}</p>
          <p style="margin: 4px 0;"><strong>Phone:</strong> ${data.details?.customerPhone || 'N/A'}</p>
          <p style="margin: 4px 0;"><strong>Email:</strong> ${data.details?.customerEmail || 'N/A'}</p>
        </div>
        <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">This notification was sent automatically from your website template.</p>
      </div>
    `;
  } else {
    html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
        <h2 style="color: #f59e0b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 24px;">New Website Inquiry</h2>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <p><strong>From:</strong> ${data.name} (&lt;${data.email}&gt;)</p>
          <p><strong>Subject:</strong> ${data.subject || 'General Inquiry'}</p>
        </div>
        <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; white-space: pre-wrap;">
          <strong>Message:</strong><br/>
          ${data.message}
        </div>
        <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">This notification was sent automatically from your website template.</p>
      </div>
    `;
  }

  if (!resend) {
    console.warn("[Notification Layer] Resend not configured. Logging data to console:");
    console.log(JSON.stringify({ to: toEmail, subject, data }, null, 2));
    return { status: 'logged_locally' };
  }

  try {
    const { data: resData, error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: subject,
      html: html,
    });

    if (error) {
      console.error("[Notification Layer] Resend error:", error);
      return { status: 'error', error };
    }

    console.log(`[Notification Layer] Email sent successfully: ${resData?.id}`);
    return { status: 'sent', id: resData?.id };
  } catch (err) {
    console.error("[Notification Layer] Failed to send email:", err);
    return { status: 'failed' };
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Webhook endpoint MUST use raw body for signature verification
  app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const stripe = getStripe();
    if (!stripe) {
      console.warn("[Template Setup] Missing STRIPE_SECRET_KEY — webhook endpoint disabled.");
      return res.status(503).json({ error: "Payment service not configured", status: 503 });
    }

    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      return res.status(400).send("Webhook signature or secret missing");
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;
        const appointmentId = session.metadata?.appointmentId;
        
        console.log(`Payment successful for appointment: ${appointmentId}`);
        
        // Trigger Notification
        await sendNotification(
          "New Confirmed Booking (Paid)",
          { 
            appointmentId, 
            details: { 
              customerEmail: session.customer_details?.email,
              amount: (session.amount_total! / 100).toFixed(2),
              paymentStatus: 'paid'
            } 
          },
          'booking'
        );
        break;
      case "checkout.session.expired":
        // Handle expired session
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  });

  // Standard JSON parsing for other routes
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/ai/analyze", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: "AI features are not configured on the server.",
      });
    }

    const body = req.body ?? {};
    const kind = body.type;

    try {
      if (kind === "strategic") {
        const { appointments, staff, services } = body;
        if (!Array.isArray(appointments) || !Array.isArray(staff) || !Array.isArray(services)) {
          return res.status(400).json({
            error: "For type \"strategic\", appointments, staff, and services must be arrays.",
          });
        }

        const prompt = buildStrategicAnalysisPrompt(appointments, staff, services);
        const text = await geminiGenerateContent(apiKey, {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          responseMimeType: "application/json",
        });

        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          return res.status(502).json({
            error: "The model returned invalid JSON.",
            raw: text,
          });
        }

        return res.json(parsed);
      }

      if (kind === "style") {
        const { userDescription, services } = body;
        if (typeof userDescription !== "string" || !Array.isArray(services)) {
          return res.status(400).json({
            error: "For type \"style\", userDescription must be a string and services must be an array.",
          });
        }

        const prompt = buildStyleConsultationPrompt(userDescription, services);
        const text = await geminiGenerateContent(apiKey, {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          responseMimeType: "application/json",
        });

        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch {
          return res.status(502).json({
            error: "The model returned invalid JSON.",
            raw: text,
          });
        }

        return res.json(parsed);
      }

      return res.status(400).json({
        error: 'Body "type" must be "strategic" or "style".',
      });
    } catch (err) {
      console.error("[AI Analyze] Request failed:", err);
      return res.status(502).json({ error: "AI analysis request failed." });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "AI features are not configured on the server." });
    }

    const { messages, brand } = req.body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages must be a non-empty array." });
    }

    const contents: GeminiChatPart[] = [];
    for (const m of messages) {
      if (
        !m ||
        (m.role !== "user" && m.role !== "model") ||
        typeof m.text !== "string"
      ) {
        return res.status(400).json({
          error: 'Each message must include role "user" or "model" and a string text field.',
        });
      }
      contents.push({ role: m.role, parts: [{ text: m.text }] });
    }

    const hasPersona =
      brand &&
      typeof brand === "object" &&
      typeof (brand as { aiPersona?: unknown }).aiPersona === "string" &&
      String((brand as { aiPersona: string }).aiPersona).trim().length > 0;

    const instruction = hasPersona
      ? String((brand as { aiPersona: string }).aiPersona).trim()
      : brand && typeof brand.name === "string" && typeof brand.tagline === "string"
        ? `You are the AI Consulting Agent for ${brand.name}.
Tagline: ${brand.tagline}
Your job is to assist clients by providing information about our services, hours, location, and offering helpful advice.
Be sharp, professional, yet welcoming. Keep answers concise. Avoid complex formatting when possible.`
        : `You are the AI Consulting Agent for this business.
Assist clients with services, hours, location, and general inquiries.
Be sharp, professional, yet welcoming. Keep answers concise.`;

    try {
      const text = await geminiGenerateContent(apiKey, {
        contents,
        systemInstruction: instruction,
        temperature: 0.7,
      });
      return res.json({ text });
    } catch (err) {
      console.error("[AI Chat] Request failed:", err);
      return res.status(502).json({ error: "Chat request failed." });
    }
  });

  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, message, subject } = req.body;
      
      console.log(`[Contact Form] Received inquiry from ${name} (${email})`);
      
      await sendNotification(
        `Website Inquiry: ${subject || 'General Contact'}`,
        req.body,
        'contact'
      );

      res.json({ success: true, message: "Thank you! Your message has been received." });
    } catch (error) {
      console.error("Contact form error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.post("/api/notify-booking", async (req, res) => {
    // Used for unpaid/non-Stripe bookings
    try {
      const { appointmentId, details } = req.body;
      await sendNotification(
        "New Booking Request",
        req.body,
        'booking'
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to process notification" });
    }
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const stripe = getStripe();
      if (!stripe) {
        console.warn("[Template Setup] Missing STRIPE_SECRET_KEY — checkout session creation disabled.");
        return res.status(503).json({
          error: "Payment service not configured",
          status: 503,
          details: "Add STRIPE_SECRET_KEY to your .env file to enable payments.",
        });
      }

      const { appointmentId, price, name, customerEmail, mode } = req.body;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: customerEmail,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: mode === 'deposit' ? `Deposit for ${name}` : name,
              },
              unit_amount: price, // amount in cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.APP_URL || `http://localhost:${PORT}`}/?booking_status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL || `http://localhost:${PORT}`}/?booking_status=cancelled`,
        metadata: {
          appointmentId: appointmentId,
        },
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      // Important: Disable standard vite server watching since we handle it
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    logStartupStatus();
  });
}

startServer();
