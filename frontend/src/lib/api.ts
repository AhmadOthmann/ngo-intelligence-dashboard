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
  category:
    | "Burundi"
    | "Funding"
    | "Health"
    | "Education"
    | "GBV"
    | "Animal Welfare"
    | "Humanitarian"
    | "Politics/Security"
    | "Development"
    | "Other"
    | null;
  relevance_score: number | null;
  is_funding_opportunity: boolean;
  deadline: string | null;
  target_org: string | null;
  why_relevant: string | null;
  recommended_action: string | null;
  translated_text: string | null;
  translated_language: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ApiStatus {
  status: string;
  ai_provider: string;
  openai_configured: boolean;
  database: string;
}

export interface IngestResult {
  ingested: number;
  errors: Array<{ feed_url: string; error: string }>;
}

export interface DigestResult {
  generated_at: string;
  headline: string;
  executive_summary: string;
  top_priorities: string[];
  funding_opportunities: string[];
  recommended_actions: string[];
  risk_alerts: string[];
  top_items: BackendItem[];
  funding_items: BackendItem[];
}

export interface AnalyzeAllResult {
  analyzed: number;
  errors: Array<{ item_id: number; error: string }>;
}

export interface ItemsResponse {
  items: BackendItem[];
  count: number;
  limit: number;
  offset: number;
}

export interface ItemQuery {
  q?: string;
  category?: string;
  fundingOnly?: boolean;
  limit?: number;
  offset?: number;
}

export async function getApiStatus(): Promise<ApiStatus> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error(`API status could not be loaded (${response.status})`);
  }
  return response.json();
}

export async function getItemsPage(query: ItemQuery = {}): Promise<ItemsResponse> {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.category?.trim()) params.set("category", query.category.trim());
  if (query.fundingOnly) params.set("funding_only", "true");
  if (query.limit != null) params.set("limit", String(query.limit));
  if (query.offset != null) params.set("offset", String(query.offset));

  const queryString = params.toString();
  const response = await fetch(`${API_BASE_URL}/items${queryString ? `?${queryString}` : ""}`);
  if (!response.ok) {
    throw new Error(`Items could not be loaded (${response.status})`);
  }
  return response.json();
}

export async function getItems(query: ItemQuery = {}): Promise<BackendItem[]> {
  return (await getItemsPage(query)).items;
}

export async function getFunding(limit = 50, offset = 0): Promise<BackendItem[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const response = await fetch(`${API_BASE_URL}/funding?${params}`);
  if (!response.ok) {
    throw new Error(`Funding items could not be loaded (${response.status})`);
  }
  return response.json();
}

export async function getDigest(): Promise<DigestResult> {
  const response = await fetch(`${API_BASE_URL}/digest`);
  if (!response.ok) {
    throw new Error(`Digest could not be loaded (${response.status})`);
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

export async function analyzeItem(id: number): Promise<BackendItem> {
  const response = await fetch(`${API_BASE_URL}/analyze/${id}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Item analysis failed (${response.status})`);
  }
  return response.json();
}

export async function analyzeAll(limit = 100): Promise<AnalyzeAllResult> {
  const response = await fetch(`${API_BASE_URL}/analyze/all?limit=${limit}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Bulk analysis failed (${response.status})`);
  }
  return response.json();
}

export async function translateItem(id: number, targetLanguage: string): Promise<BackendItem> {
  const response = await fetch(`${API_BASE_URL}/translate/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_language: targetLanguage }),
  });
  if (!response.ok) {
    throw new Error(`Translation failed (${response.status})`);
  }
  return response.json();
}

export function itemToSignal(item: BackendItem): Signal {
  const type = mapType(item);
  const summary = item.summary || truncate(cleanText(item.raw_text), 280);
  const relevance = item.relevance_score == null ? 50 : item.relevance_score;

  return {
    id: `item-${item.id}`,
    priority: relevance >= 75 ? "urgent" : relevance >= 40 ? "relevant" : "info",
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
        : relevance >= 85
          ? "urgent"
          : relevance >= 65
            ? "important"
            : relevance >= 35
              ? "medium"
              : "low",
    whyRecommended:
      item.why_relevant ||
      (item.relevance_score == null
        ? "Imported from RSS and ready for backend analysis."
        : `Backend relevance score: ${item.relevance_score}.`),
    suggestedAction:
      item.recommended_action ||
      (type === "funding"
        ? "Review eligibility and deadline details from the source."
        : "Review the source and save it if it matters to your NGO."),
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
  if (item.is_funding_opportunity || item.category === "Funding") return "funding";
  if (item.category === "Development") return "report";
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
