// Mock AI behavior. Replace these stubs with real API calls later.
// Each function is intentionally small and pure so it can be swapped
// with a server function (createServerFn) that calls an LLM gateway.

import type { NgoProfile, Signal } from "./types";

export function generateNgoProfile(input: {
  name: string;
  country: string;
  language: string;
  description?: string;
  topics: string[];
  keywords?: string;
}): Pick<NgoProfile, "focusAreas" | "regions" | "suggestedKeywords"> {
  const kw = (input.keywords ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    focusAreas: Array.from(new Set([...input.topics.slice(0, 6), "small NGO funding"])),
    regions: Array.from(new Set([input.country, ...kw.filter((k) => /^[A-Z]/.test(k))])).slice(0, 6),
    suggestedKeywords: [
      `${input.topics[0] ?? "education"} ${input.country}`,
      "school attendance",
      "vocational training",
      "German NGO funding",
      "East Africa",
    ],
  };
}

export function classifySignal(s: Signal): Signal["type"] {
  return s.type;
}

export function scoreSignalForNgo(_signal: Signal, _profile: NgoProfile): number {
  return Math.random();
}

export function translateMessage(text: string, targetLang: string): string {
  return `[${targetLang} preview] ${text}`;
}

export function summarizeSignal(s: Signal): string {
  return s.summary;
}

export function extractFundingDetails(s: Signal) {
  return s.funding ?? null;
}

export function generateSuggestedAction(s: Signal): string {
  return s.suggestedAction;
}

export function draftOutreachMessage(opts: {
  topic: string;
  language: string;
  peerName: string;
}): string {
  return `Hallo ${opts.peerName}, wir interessieren uns für ${opts.topic}. Habt ihr Erfahrungen, die ihr teilen könnt?`;
}
