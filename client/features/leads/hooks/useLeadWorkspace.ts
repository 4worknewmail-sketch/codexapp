import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLeadsSelection } from "@/hooks/useLeadsSelection";
import type { ChatMessage, FilterCriteria, Lead, SavedFilter, SavedList, UnlockKind } from "../types";

// Sample values reused by the AI mock generator to produce believable demo rows.
const SAMPLE_FIRST_NAMES = ["Alex", "Jamie", "Taylor", "Riley", "Jordan"];
const SAMPLE_LAST_NAMES = ["Lee", "Patel", "Garcia", "Smith", "Kim"];
const SAMPLE_INDUSTRIES = ["Technology", "Finance", "Healthcare", "Manufacturing", "Retail"];
const SAMPLE_LOCATIONS = ["United States", "India", "United Kingdom", "Canada", "Australia"];

const PAGE_SIZE = 10;

export interface LeadWorkspaceState {
  leads: Lead[];
  paginatedLeads: Lead[];
  totalPages: number;
  currentPage: number;
  search: string;
  sortOrder: "asc" | "desc";
  credits: number;
  savedLists: SavedList[];
  savedFilters: SavedFilter[];
  activeListId: string | number | null;
  activeFilterId: string | number | null;
  selection: ReturnType<typeof useLeadsSelection>;
  chatMessages: ChatMessage[];
  aiPrompt: string;
}

export interface LeadWorkspaceActions {
  setSearch: (value: string) => void;
  setSortOrder: (value: "asc" | "desc") => void;
  goToPage: (page: number) => void;
  unlock: (id: number, kind: UnlockKind) => Promise<void>;
  createList: (name: string, leadIds: number[]) => Promise<void>;
  updateList: (id: string | number, name: string, leadIds: number[]) => Promise<void>;
  deleteList: (id: string | number) => Promise<void>;
  applyList: (id: string | number | null) => void;
  createFilter: (name: string, criteria: FilterCriteria) => Promise<void>;
  updateFilter: (id: string | number, name: string, criteria: FilterCriteria) => Promise<void>;
  deleteFilter: (id: string | number) => Promise<void>;
  applyFilter: (id: string | number | null) => void;
  importSeed: () => Promise<void>;
  importLeads: (rows: Partial<Lead>[]) => Promise<void>;
  exportLeads: () => Promise<Lead[]>;
  generateLeads: (prompt: string) => Promise<void>;
  setAiPrompt: (value: string) => void;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
  clearSelection: () => void;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export const useLeadWorkspace = (
  selection: ReturnType<typeof useLeadsSelection>
): [LeadWorkspaceState, LeadWorkspaceActions] => {
  const { accessToken, credits: profileCredits, refreshProfile } = useAuth();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [credits, setCredits] = useState(profileCredits ?? 25);
  const [savedLists, setSavedLists] = useState<SavedList[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [activeListId, setActiveListId] = useState<string | number | null>(null);
  const [activeFilterId, setActiveFilterId] = useState<string | number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Need any help? Start chat now..." }
  ]);
  const [aiPrompt, setAiPrompt] = useState("");

  // Fetch leads + saved resources when a token is available.
  useEffect(() => {
    if (!accessToken) return;
    const load = async () => {
      await refreshProfile();
      try {
        const fetchedLeads: Lead[] = await api.fetchLeads(accessToken);
        if (fetchedLeads.length === 0) {
          // Import the editable seed CSV once so every new user sees data.
          await api.importSeed(accessToken);
        }
        const finalLeads = fetchedLeads.length ? fetchedLeads : await api.fetchLeads(accessToken);
        setLeads(finalLeads);
        const [lists, filters] = await Promise.all([
          api.listSavedLists(accessToken),
          api.listSavedFilters(accessToken),
        ]);
        setSavedLists(lists);
        setSavedFilters(filters);
        setCredits(profileCredits ?? 25);
      } catch (error) {
        console.error(error);
        toast.error("Unable to load your workspace");
      }
    };
    load();
  }, [accessToken, profileCredits, refreshProfile]);

  const filteredLeads = useMemo(() => {
    const activeFilter = savedFilters.find((f) => f.id === activeFilterId);
    return leads
      .filter((lead) => {
        const matchesSearch =
          search === "" ||
          lead.name.toLowerCase().includes(search.toLowerCase()) ||
          lead.location.toLowerCase().includes(search.toLowerCase()) ||
          lead.industry.toLowerCase().includes(search.toLowerCase());

        if (!activeFilter) return matchesSearch;

        const inCountries =
          activeFilter.filters.countries.length === 0 ||
          activeFilter.filters.countries.includes(lead.location);
        const inIndustries =
          activeFilter.filters.industries.length === 0 ||
          activeFilter.filters.industries.includes(lead.industry);
        const hasTags = activeFilter.filters.tags.length === 0; // tags are UI-only today
        return matchesSearch && inCountries && inIndustries && hasTags;
      })
      .filter((lead) => {
        if (!activeListId) return true;
        const list = savedLists.find((l) => l.id === activeListId);
        return list ? list.leads.includes(lead.id) : true;
      });
  }, [activeFilterId, activeListId, leads, savedFilters, savedLists, search]);

  const sortedLeads = useMemo(() => {
    const sorted = [...filteredLeads];
    sorted.sort((a, b) => (sortOrder === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
    return sorted;
  }, [filteredLeads, sortOrder]);

  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedLeads.slice(start, start + PAGE_SIZE);
  }, [currentPage, sortedLeads]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedLeads.length / PAGE_SIZE)), [sortedLeads.length]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const unlock = useCallback(async (id: number, kind: UnlockKind) => {
    if (!accessToken) return;
    try {
      const result = await api.unlock(accessToken, id, kind);
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === id
            ? {
                ...lead,
                emailUnlocked: kind === "email" ? true : lead.emailUnlocked,
                phoneUnlocked: kind === "phone" ? true : lead.phoneUnlocked,
              }
            : lead
        )
      );
      setCredits(result.credits ?? credits);
      toast.success(kind === "email" ? "Email unlocked (–1 credit)" : "Phone unlocked (–2 credits)");
    } catch (error) {
      toast.error("Not enough credits to unlock");
    }
  }, [accessToken, credits]);

  const syncLeadsFromApi = useCallback(async () => {
    if (!accessToken) return;
    const fetchedLeads = await api.fetchLeads(accessToken);
    setLeads(fetchedLeads);
  }, [accessToken]);

  const importSeed = useCallback(async () => {
    if (!accessToken) return;
    await api.importSeed(accessToken);
    await syncLeadsFromApi();
  }, [accessToken, syncLeadsFromApi]);

  const importLeads = useCallback(async (rows: Partial<Lead>[]) => {
    if (!accessToken) return;
    await api.importLeads(accessToken, rows);
    await syncLeadsFromApi();
    toast.success("Leads imported");
  }, [accessToken, syncLeadsFromApi]);

  const exportLeads = useCallback(async () => {
    if (!accessToken) return [];
    return api.exportLeads(accessToken);
  }, [accessToken]);

  const createList = useCallback(async (name: string, leadIds: number[]) => {
    if (!accessToken) return;
    const created = await api.createSavedList(accessToken, { name, leads: leadIds });
    setSavedLists((prev) => [...prev, created]);
    setActiveListId(created.id);
    toast.success("List saved");
  }, [accessToken]);

  const updateList = useCallback(async (id: string | number, name: string, leadIds: number[]) => {
    if (!accessToken) return;
    const updated = await api.updateSavedList(accessToken, id, { name, leads: leadIds });
    setSavedLists((prev) => prev.map((l) => (l.id === id ? updated : l)));
    toast.success("List updated");
  }, [accessToken]);

  const deleteList = useCallback(async (id: string | number) => {
    if (!accessToken) return;
    await api.deleteSavedList(accessToken, id);
    setSavedLists((prev) => prev.filter((l) => l.id !== id));
    if (activeListId === id) {
      setActiveListId(null);
    }
    toast.success("List deleted");
  }, [accessToken, activeListId]);

  const applyList = useCallback((id: string | number | null) => {
    setActiveListId(id);
    selection.clear();
    setCurrentPage(1);
  }, [selection]);

  const createFilter = useCallback(async (name: string, criteria: FilterCriteria) => {
    if (!accessToken) return;
    const created = await api.createSavedFilter(accessToken, { name, criteria });
    setSavedFilters((prev) => [...prev, created]);
    setActiveFilterId(created.id);
    toast.success("Filter saved");
  }, [accessToken]);

  const updateFilter = useCallback(async (id: string | number, name: string, criteria: FilterCriteria) => {
    if (!accessToken) return;
    const updated = await api.updateSavedFilter(accessToken, id, { name, criteria });
    setSavedFilters((prev) => prev.map((f) => (f.id === id ? updated : f)));
    toast.success("Filter updated");
  }, [accessToken]);

  const deleteFilter = useCallback(async (id: string | number) => {
    if (!accessToken) return;
    await api.deleteSavedFilter(accessToken, id);
    setSavedFilters((prev) => prev.filter((f) => f.id !== id));
    if (activeFilterId === id) {
      setActiveFilterId(null);
    }
    toast.success("Filter deleted");
  }, [accessToken, activeFilterId]);

  const applyFilter = useCallback((id: string | number | null) => {
    setActiveFilterId(id);
    setCurrentPage(1);
  }, []);

  const generateLeads = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return;
    if (credits < 5) {
      setChatMessages((prev) => [
        ...prev,
        { role: "user", content: prompt },
        { role: "assistant", content: "Not enough credits to generate leads. You need 5 credits." },
      ]);
      return;
    }

    // Locally craft leads but persist them via the import endpoint so they stay
    // tied to the user across sessions.
    const generated = Array.from({ length: 10 }, () => ({
      name: `${SAMPLE_FIRST_NAMES[Math.floor(Math.random() * SAMPLE_FIRST_NAMES.length)]} ${
        SAMPLE_LAST_NAMES[Math.floor(Math.random() * SAMPLE_LAST_NAMES.length)]
      }`,
      industry: SAMPLE_INDUSTRIES[Math.floor(Math.random() * SAMPLE_INDUSTRIES.length)],
      location: SAMPLE_LOCATIONS[Math.floor(Math.random() * SAMPLE_LOCATIONS.length)],
      email: `lead${Math.random().toString(36).substring(7)}@example.com`,
      phone: `(${Math.floor(Math.random() * 900) + 100}) 555-${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0")}`,
      website: `example${Math.random().toString(36).substring(7)}.com`,
      source: "ai",
    }));

    await importLeads(generated);
    setCredits((prev) => prev - 5);
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: prompt },
      { role: "assistant", content: "Generated 10 new leads and deducted 5 credits." },
    ]);
  }, [credits, importLeads, leads]);

  const clearSelection = useCallback(() => {
    selection.clear();
  }, [selection]);

  const state: LeadWorkspaceState = {
    leads,
    paginatedLeads,
    totalPages,
    currentPage,
    search,
    sortOrder,
    credits,
    savedLists,
    savedFilters,
    activeListId,
    activeFilterId,
    selection,
    chatMessages,
    aiPrompt,
  };

  const actions: LeadWorkspaceActions = {
    setSearch,
    setSortOrder,
    goToPage,
    unlock,
    createList,
    updateList,
    deleteList,
    applyList,
    createFilter,
    updateFilter,
    deleteFilter,
    applyFilter,
    importSeed,
    importLeads,
    exportLeads,
    generateLeads,
    setAiPrompt,
    setCredits,
    clearSelection,
    setChatMessages,
  };

  return [state, actions];
};
