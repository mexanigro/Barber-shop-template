import { readViteEnv } from "./viteEnv";

export type ClientStatus = "active" | "suspended" | "trial" | "maintenance" | "archived";

export function resolveClientId(): string {
  const fromVite = readViteEnv("VITE_CLIENT_ID")?.trim();
  const fromNextPublic = readViteEnv("NEXT_PUBLIC_CLIENT_ID")?.trim();
  return fromVite || fromNextPublic || "";
}

export const tenant = {
  clientId: resolveClientId(),
};
