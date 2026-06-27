import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a timestamp WhatsApp-style:
 * - less than 1 hour ago → "Just now", "5 min ago"
 * - 1 hour or more ago → "HH:mm"
 */
export function formatChatTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
