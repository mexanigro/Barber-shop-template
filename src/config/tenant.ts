export type ClientStatus = "active" | "suspended" | "trial" | "maintenance" | "archived";

const DEFAULT_CLIENT_ID = "client_barber_01";

export function resolveClientId(): string {
  const fromVite = (import.meta.env.VITE_CLIENT_ID as string | undefined)?.trim();
  const fromNextPublic = (import.meta.env.NEXT_PUBLIC_CLIENT_ID as string | undefined)?.trim();
  return fromVite || fromNextPublic || DEFAULT_CLIENT_ID;
}

export const tenant = {
  clientId: resolveClientId(),
};
