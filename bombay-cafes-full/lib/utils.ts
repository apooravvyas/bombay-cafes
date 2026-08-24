import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * "1.2 km" / "600 m" — only ever shown when the browser gave us a position.
 * Metres are rounded to the nearest 50 and floored at 50: browser geolocation
 * is not accurate enough to justify "23 m", and claiming it would be a lie
 * about precision.
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    const metres = Math.max(50, Math.round((km * 1000) / 50) * 50);
    return `${metres} m`;
  }
  return `${km.toFixed(1)} km`;
}

export function initials(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
