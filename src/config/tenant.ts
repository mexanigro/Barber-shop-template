export type ClientStatus = "active" | "suspended" | "trial" | "maintenance" | "archived";

export function resolveClientId(): string {
  const fromVite = (import.meta.env.VITE_CLIENT_ID as string | undefined)?.trim();
  const fromNextPublic = (import.meta.env.NEXT_PUBLIC_CLIENT_ID as string | undefined)?.trim();
  return fromVite || fromNextPublic || "";
}

export const tenant = {
  clientId: resolveClientId(),
};
