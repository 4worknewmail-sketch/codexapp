// Shared lead-related types used across the split components.
// Keeping these in one place prevents drift as we move logic out of the
// previous monolithic Index page.

export interface Lead {
  id: number;
  name: string;
  industry: string;
  location: string;
  email: string;
  phone: string;
  website: string;
  source?: string;
  emailUnlocked: boolean;
  phoneUnlocked: boolean;
  isImported?: boolean;
}

export interface SavedList {
  id: string | number;
  name: string;
  leads: number[]; // store only lead IDs for backend alignment
  createdAt?: number;
}

export interface FilterCriteria {
  countries: string[];
  industries: string[];
  tags: string[];
}

export interface SavedFilter {
  id: string | number;
  name: string;
  filters: FilterCriteria;
  createdAt?: number;
}

export type UnlockKind = "email" | "phone";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
