type ViteEnv = Record<string, string | boolean | undefined>;

export function readViteEnv(key: string): string | undefined {
  const env = import.meta.env as ViteEnv | undefined;
  const value = env?.[key];
  return typeof value === "string" ? value : undefined;
}
