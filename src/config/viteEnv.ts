type ViteEnv = Record<string, string | undefined>;

export function readViteEnv(key: string): string | undefined {
  const env = (import.meta as ImportMeta & { env?: ViteEnv }).env;
  return env?.[key];
}
