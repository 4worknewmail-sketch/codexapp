import type { FilterCriteria, Lead, SavedFilter, SavedList } from "@/features/leads/types";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

type RequestOptions = {
  method?: string;
  body?: any;
  token?: string | null;
};

type LeadResponse = {
  id: number;
  name: string;
  industry: string;
  location: string;
  email: string;
  phone: string;
  website: string;
  source?: string;
  email_unlocked: boolean;
  phone_unlocked: boolean;
};

type SavedListResponse = {
  id: number;
  name: string;
  leads: number[];
};

type SavedFilterResponse = {
  id: number;
  name: string;
  criteria: FilterCriteria;
};

type CheckoutSession = { id: string; url: string };

async function request<T>(path: string, { method = "GET", body, token }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

codex/summarize-project-features-and-implementations
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    const reason =
      networkError instanceof Error && networkError.message ? networkError.message : "Network request failed";
    throw new Error(
      `${reason}. Unable to reach the backend at ${API_BASE_URL}. ` +
        `Start the Django server with: python backend/manage.py runserver 0.0.0.0:8000`
    );
  }

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = await response.json();
      if (typeof data === "object" && data) {
        message = (data as { detail?: string; message?: string }).detail ||
          (data as { message?: string }).message ||
          JSON.stringify(data);
      }
    } catch (jsonError) {
      const fallbackText = await response.text();
      if (fallbackText) message = fallbackText;
    }
    throw new Error(message || "Request failed");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || response.statusText);
main
  }

  return (await response.json()) as T;
}

const mapLead = (lead: LeadResponse): Lead => ({
  id: lead.id,
  name: lead.name,
  industry: lead.industry,
  location: lead.location,
  email: lead.email,
  phone: lead.phone,
  website: lead.website,
  source: lead.source,
  emailUnlocked: lead.email_unlocked,
  phoneUnlocked: lead.phone_unlocked,
  isImported: lead.source !== "seed",
});

const mapList = (list: SavedListResponse): SavedList => ({
  id: list.id,
  name: list.name,
  leads: list.leads,
});

const mapFilter = (filter: SavedFilterResponse): SavedFilter => ({
  id: filter.id,
  name: filter.name,
  filters: filter.criteria,
});

export const api = {
  signup: (payload: { email: string; password: string }) =>
    request<{ user: { email: string; credits: number }; access: string; refresh: string }>("/api/auth/register/", {
      method: "POST",
      body: payload,
    }),
  login: (payload: { email: string; password: string }) =>
    request<{ access: string; refresh: string }>("/api/auth/login/", { method: "POST", body: payload }),
  profile: (token: string) => request<{ id: number; email: string; credits: number }>("/api/auth/me/", { token }),
  fetchLeads: async (token: string): Promise<Lead[]> => {
    const response = await request<LeadResponse[]>("/api/leads/", { token });
    return response.map(mapLead);
  },
  listSavedLists: async (token: string): Promise<SavedList[]> => {
    const lists = await request<SavedListResponse[]>("/api/lists/", { token });
    return lists.map(mapList);
  },
  createSavedList: async (token: string, payload: { name: string; leads: number[] }): Promise<SavedList> => {
    const created = await request<SavedListResponse>("/api/lists/", { method: "POST", token, body: payload });
    return mapList(created);
  },
  updateSavedList: async (token: string, id: string | number, payload: { name: string; leads: number[] }): Promise<SavedList> => {
    const updated = await request<SavedListResponse>(`/api/lists/${id}/`, { method: "PUT", token, body: payload });
    return mapList(updated);
  },
  deleteSavedList: (token: string, id: string | number) => request(`/api/lists/${id}/`, { method: "DELETE", token }),
  listSavedFilters: async (token: string): Promise<SavedFilter[]> => {
    const filters = await request<SavedFilterResponse[]>("/api/filters/", { token });
    return filters.map(mapFilter);
  },
  createSavedFilter: async (token: string, payload: { name: string; criteria: FilterCriteria }): Promise<SavedFilter> => {
    const created = await request<SavedFilterResponse>("/api/filters/", { method: "POST", token, body: payload });
    return mapFilter(created);
  },
  updateSavedFilter: async (token: string, id: string | number, payload: { name: string; criteria: FilterCriteria }): Promise<SavedFilter> => {
    const updated = await request<SavedFilterResponse>(`/api/filters/${id}/`, { method: "PUT", token, body: payload });
    return mapFilter(updated);
  },
  deleteSavedFilter: (token: string, id: string | number) => request(`/api/filters/${id}/`, { method: "DELETE", token }),
  unlock: async (token: string, leadId: number, type: "email" | "phone") => {
    return request<{ lead: LeadResponse; credits: number }>("/api/leads/unlock/", {
      method: "POST",
      token,
      body: { lead_id: leadId, type },
    });
  },
  importSeed: (token: string) => request<{ created: LeadResponse[] }>("/api/import/seed/", { method: "POST", token }),
  importLeads: (token: string, leads: Partial<Lead>[]) =>
    request<{ created: LeadResponse[] }>("/api/leads/import/", { method: "POST", token, body: { leads } }),
  exportLeads: async (token: string): Promise<Lead[]> => {
    const response = await request<LeadResponse[]>("/api/leads/export/", { token });
    return response.map(mapLead);
  },
  createCheckoutSession: (token: string, amount: number, credits: number): Promise<CheckoutSession> =>
    request<CheckoutSession>("/api/credits/checkout/", { method: "POST", token, body: { amount, credits } }),
  confirmCredits: (token: string, sessionId: string, credits: number) =>
    request<{ credits: number }>("/api/credits/confirm/", { method: "POST", token, body: { session_id: sessionId, credits } }),
};
