export type Priority = "urgent" | "relevant" | "info";
export type SignalType = "news" | "funding" | "report" | "peer";
export type SavedStatus =
  | "saved"
  | "reviewing"
  | "contacted"
  | "digest"
  | "applying"
  | "archived";
export type SavedCategory =
  | "funding_pipeline"
  | "news_press"
  | "field_intel"
  | "peer"
  | "watchlist";

export interface FundingDetails {
  deadline: string;
  amount: string;
  funder: string;
  eligibility: string;
  canApply: "yes" | "check" | "no";
}

export interface PeerActivity {
  text: string;
}

export interface Signal {
  id: string;
  priority: Priority;
  type: SignalType;
  title: string;
  source: string;
  date: string;
  originalLanguage: string;
  summary: string;
  longSummary?: string;
  keyPoints?: string[];
  aiImportance?: "urgent" | "important" | "medium" | "low";
  whyRecommended: string;
  peerActivity?: PeerActivity[];
  suggestedAction: string;
  funding?: FundingDetails;
  translatedText?: string;
  translatedLanguage?: string;
  url?: string;
}

export interface NgoProfile {
  id: string;
  name: string;
  country: string;
  city?: string;
  language: string;
  website?: string;
  description?: string;
  topics: string[];
  keywords: string[];
  focusAreas: string[];
  regions: string[];
  suggestedKeywords: string[];
  fundingPrefs?: {
    enabled: boolean;
    regions: string[];
    min?: string;
    max?: string;
    applicantTypes: string[];
    fundingTopics: string[];
    chips: string[];
    urgency?: string;
  };
  sources?: string[];
  sourcesNote?: string;
}

export interface SavedItem {
  signal: Signal;
  category: SavedCategory;
  status: SavedStatus;
  savedAt: string;
  note?: string;
  importance?: "high" | "medium" | "low";
}

export interface ChatMessage {
  id: string;
  sender: "me" | "peer";
  originalText: string;
  originalLang: string;
  translatedText: string;
  targetLang: string;
  translationError?: string;
  timestamp: string;
  sentAt?: string;
}

export interface Conversation {
  id: string;
  orgName: string;
  country: string;
  sharedTopics: string[];
  translationStatus: string;
  messages: ChatMessage[];
}
