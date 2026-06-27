import type { Signal, SignalType } from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

export interface BackendItem {
  id: number;
  title: string;
  url: string;
  source: string;
  published_at: string | null;
  language: string | null;
  raw_text: string;
  summary: string | null;
  category: "news" | "funding" | "policy" | "research" | "other" | null;
  relevance_score: number | null;
  is_funding_opportunity: boolean;
  deadline: string | null;
  translated_text: string | null;
  created_at: string;
}

export interface IngestResult {
  ingested: number;
  errors: Array<{ feed_url: string; error: string }>;
}

export interface ItemQuery {
  q?: string;
  limit?: number;
  offset?: number;
}

export async function getItems(query: ItemQuery = {}): Promise<BackendItem[]> {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.limit != null) params.set("limit", String(query.limit));
  if (query.offset != null) params.set("offset", String(query.offset));

  const queryString = params.toString();
  const response = await fetch(`${API_BASE_URL}/items${queryString ? `?${queryString}` : ""}`);
  if (!response.ok) {
    throw new Error(`Items could not be loaded (${response.status})`);
  }
  return response.json();
}

export async function getItem(id: number): Promise<BackendItem> {
  const response = await fetch(`${API_BASE_URL}/items/${id}`);
  if (!response.ok) {
    throw new Error(`Item could not be loaded (${response.status})`);
  }
  return response.json();
}

export async function ingestRss(feeds?: string[]): Promise<IngestResult> {
  const response = await fetch(`${API_BASE_URL}/ingest/rss`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feeds: feeds ?? [] }),
  });
  if (!response.ok) {
    throw new Error(`RSS ingestion failed (${response.status})`);
  }
  return response.json();
}

export function itemToSignal(item: BackendItem): Signal {
  const type = mapType(item);
  const summary = item.summary || truncate(cleanText(item.raw_text), 280);
  const relevance = item.relevance_score ?? 0.5;

  return {
    id: `item-${item.id}`,
    priority: relevance >= 0.75 ? "urgent" : relevance >= 0.4 ? "relevant" : "info",
    type,
    title: item.title,
    source: item.source,
    date: formatDate(item.published_at ?? item.created_at),
    originalLanguage: item.language || "unknown",
    summary,
    longSummary: cleanText(item.raw_text),
    aiImportance:
      item.relevance_score == null
        ? undefined
        : relevance >= 0.85
          ? "urgent"
          : relevance >= 0.65
            ? "important"
            : relevance >= 0.35
              ? "medium"
              : "low",
    whyRecommended:
      item.relevance_score == null
        ? "Imported from RSS and ready for backend analysis."
        : `Backend relevance score: ${item.relevance_score.toFixed(2)}.`,
    suggestedAction:
      type === "funding"
        ? "Review eligibility and deadline details from the source."
        : "Review the source and save it if it matters to your NGO.",
    funding:
      type === "funding"
        ? {
            deadline: item.deadline ? formatDate(item.deadline) : "No deadline detected",
            amount: "Check source",
            funder: item.source,
            eligibility: "Check source details",
            canApply: "check",
          }
        : undefined,
    url: item.url,
  };
}

function mapType(item: BackendItem): SignalType {
  if (item.is_funding_opportunity || item.category === "funding") return "funding";
  if (item.category === "research") return "report";
  return "news";
}

function cleanText(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
