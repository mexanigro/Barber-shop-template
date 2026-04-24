async function postJson(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

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
