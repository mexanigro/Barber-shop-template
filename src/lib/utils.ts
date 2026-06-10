import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Skeleton-reveal pair: render the <img> with an `opacity-0` class plus
 * `onLoad={revealImg}` and `ref={revealImgIfCached}` so it fades in over the
 * skeleton shimmer once the bitmap is ready. Cached bitmaps can complete
 * before React attaches the load listener — the ref callback covers that path.
 */
export const revealImg = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.classList.remove("opacity-0");
};

export const revealImgIfCached = (el: HTMLImageElement | null) => {
  if (el?.complete && el.naturalWidth > 0) el.classList.remove("opacity-0");
};

export const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget;
  // Prevent infinite loop if fallback also fails
  img.onerror = null;
  // Show a gradient placeholder instead of hiding
  img.style.objectFit = "cover";
  img.src =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231a1a2e'/%3E%3Cstop offset='100%25' stop-color='%2316213e'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23g)' width='800' height='600'/%3E%3C/svg%3E";
};
