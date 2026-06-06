import { useEffect, useMemo, useState } from "react";

export function useSplashLogo(
  logoSrc: string | undefined,
  fallbackLogoSrc: string | undefined,
) {
  const candidates = useMemo(
    () => Array.from(new Set([logoSrc, fallbackLogoSrc].filter(Boolean) as string[])),
    [logoSrc, fallbackLogoSrc],
  );
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [candidates]);

  return {
    logoSrc: candidates[candidateIndex],
    hasLogo: candidateIndex < candidates.length,
    onLogoError: () => {
      setCandidateIndex((current) => current + 1);
    },
  };
}
