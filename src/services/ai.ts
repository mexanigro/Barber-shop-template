import { env } from "../config/env";

async function postJson(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const ct = response.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const text = await response.text();
    const looksHtml = text.trimStart().slice(0, 1) === "<";
    return {
      response,
      data: {
        error: looksHtml
          ? "The server returned a web page instead of the API. Ensure this deploy runs the Express server so /api routes exist (not static hosting only)."
          : `Unexpected response (${ct || "no JSON"}).`,
      },
    };
  }
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export type CrmSnapshotAnalyzeResult =
  | { ok: true; summary: string; opportunities: string[]; churnRisk: string }
  | { ok: false; error: string };

export const aiService = {
  /**
   * Analyze schedule and appointments for strategic optimizations (server-side AI).
   */
  async analyzeStrategicOps(appointments: unknown[], staff: unknown[], services: unknown[]) {
    try {
      const { response, data } = await postJson("/api/ai/analyze", {
        type: "strategic",
        appointments,
        staff,
        services,
      });
      if (!response.ok) {
        console.error("AI Strategic Analysis failed:", (data as { error?: string })?.error ?? response.statusText);
        return null;
      }
      return data;
    } catch (error) {
      console.error("AI Strategic Analysis failed:", error);
      return null;
    }
  },

  /**
   * CRM snapshot: short AI analysis based on pre-aggregated KPIs + recent appointments.
   * No raw customer PII is sent — only computed metrics.
   */
  async analyzeCrmSnapshot(
    kpis: {
      totalBookings: number;
      confirmed: number;
      cancelled: number;
      cancelRate: number;
      estimatedRevenue: number;
      newCustomers: number;
      totalCustomers: number;
    },
    recentAppointments: unknown[],
  ): Promise<CrmSnapshotAnalyzeResult> {
    try {
      const { response, data } = await postJson("/api/ai/analyze", {
        type: "crm",
        kpis,
        recentAppointments,
        uiLanguage: env.uiLanguage,
      });
      const errMsg = (data as { error?: string })?.error;
      if (!response.ok) {
        const msg =
          errMsg ??
          (response.status === 503
            ? "AI is not configured on the server (set GEMINI_API_KEY on the deployment)."
            : response.status === 403
              ? "Request blocked: untrusted origin or tenant mismatch. Set APP_URL or ALLOWED_ORIGINS to match this site’s URL."
              : `Analysis failed (${response.status}).`);
        console.error("CRM snapshot failed:", msg, data);
        return { ok: false as const, error: msg };
      }
      const d = data as { summary?: unknown; opportunities?: unknown; churnRisk?: unknown };
      if (
        typeof d.summary !== "string" ||
        !Array.isArray(d.opportunities) ||
        typeof d.churnRisk !== "string"
      ) {
        return { ok: false as const, error: errMsg ?? "Unexpected response from AI. Try again." };
      }
      return {
        ok: true as const,
        summary: d.summary,
        opportunities: d.opportunities.map((x) => String(x)),
        churnRisk: d.churnRisk,
      };
    } catch (error) {
      console.error("CRM snapshot failed:", error);
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Network error.",
      };
    }
  },

  /**
   * Match customer description to services (server-side AI).
   */
  async getStyleConsultation(userDescription: string, services: unknown[]) {
    try {
      const { response, data } = await postJson("/api/ai/analyze", {
        type: "style",
        userDescription,
        services,
      });
      if (!response.ok) {
        console.error("Style consultation failed:", (data as { error?: string })?.error ?? response.statusText);
        return null;
      }
      return data;
    } catch (error) {
      console.error("Style consultation failed:", error);
      return null;
    }
  },
};
