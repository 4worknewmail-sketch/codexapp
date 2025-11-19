import { useEffect, useMemo, useState } from "react";
import { Menu, X, Settings, Plus, Trash2, Edit, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { useLeadsSelection } from "@/hooks/useLeadsSelection";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { LeadToolbar } from "@/features/leads/components/LeadToolbar";
import { LeadTable } from "@/features/leads/components/LeadTable";
import { useLeadWorkspace } from "@/features/leads/hooks/useLeadWorkspace";
import type { FilterCriteria, SavedFilter, SavedList } from "@/features/leads/types";
import { exportSelectedLeads, parseCsvFile } from "@/features/leads/utils/csv";

const COUNTRIES = ["United States", "India", "United Kingdom", "Canada", "Australia"];
const INDUSTRIES = ["Technology", "Finance", "Healthcare", "Manufacturing", "Retail"];

export default function Index() {
  // Shared selection across table and saved list actions.
  const selection = useLeadsSelection();
  const { accessToken, email: userEmail, logout } = useAuth();

  // Centralized workspace hook that keeps all lead/list/filter state and API calls
  // outside of this page component so logic is easier to follow.
  const [state, actions] = useLeadWorkspace(selection);
  const {
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
    chatMessages,
    aiPrompt,
  } = state;
  const {
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
    generateLeads,
    setAiPrompt,
    setCredits,
    clearSelection,
    setChatMessages,
  } = actions;

  // UI-only state for panels and forms.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);

  const [listNameInput, setListNameInput] = useState("");
  const [filterNameInput, setFilterNameInput] = useState("");
  const [filterCountries, setFilterCountries] = useState<string[]>([]);
  const [filterIndustries, setFilterIndustries] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterTagInput, setFilterTagInput] = useState("");
  const [editingListId, setEditingListId] = useState<string | number | null>(null);
  const [editingFilterId, setEditingFilterId] = useState<string | number | null>(null);
  const [topUpCredits, setTopUpCredits] = useState(25);
  const [topUpAmount, setTopUpAmount] = useState(500); // cents

  // If Stripe redirects back with a session, finalize the credit top-up.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const creditParam = params.get("credits");
    if (sessionId && creditParam && accessToken) {
      const creditsToAdd = parseInt(creditParam, 10);
      api
        .confirmCredits(accessToken, sessionId, creditsToAdd)
        .then((result) => {
          setCredits(result.credits);
          toast.success("Credits added to your account");
          params.delete("session_id");
          params.delete("credits");
          params.delete("payment");
          window.history.replaceState({}, document.title, `${window.location.pathname}`);
        })
        .catch(() => toast.error("Unable to confirm credits"));
    }
  }, [accessToken, setCredits]);

  const selectedCount = selection.getSelectedCount();

  // Saved list handlers ------------------------------------------------------
  const handleAddOrUpdateList = async () => {
    const selectedIds = selection.getSelectedLeadIds();
    if (selectedIds.length === 0) {
      toast.error("Select at least one lead to save a list");
      return;
    }
    if (editingListId) {
      await updateList(editingListId, listNameInput, selectedIds);
    } else {
      await createList(listNameInput, selectedIds);
    }
    setListModalOpen(false);
    setEditingListId(null);
    setListNameInput("");
    clearSelection();
  };

  const handleEditList = (list: SavedList) => {
    setEditingListId(list.id);
    setListNameInput(list.name);
    setListModalOpen(true);
  };

  // Saved filter handlers ----------------------------------------------------
  const handleSaveFilter = async () => {
    const criteria: FilterCriteria = { countries: filterCountries, industries: filterIndustries, tags: filterTags };
    if (editingFilterId) {
      await updateFilter(editingFilterId, filterNameInput, criteria);
    } else {
      await createFilter(filterNameInput, criteria);
    }
    setFilterModalOpen(false);
    setEditingFilterId(null);
    setFilterNameInput("");
    setFilterCountries([]);
    setFilterIndustries([]);
    setFilterTags([]);
  };

  const handleEditFilter = (filter: SavedFilter) => {
    setEditingFilterId(filter.id);
    setFilterNameInput(filter.name);
    setFilterCountries(filter.filters.countries);
    setFilterIndustries(filter.filters.industries);
    setFilterTags(filter.filters.tags);
    setFilterModalOpen(true);
  };

  const handleAddFilterTag = () => {
    if (filterTagInput.trim() && !filterTags.includes(filterTagInput.trim())) {
      setFilterTags((prev) => [...prev, filterTagInput.trim()]);
      setFilterTagInput("");
    }
  };

  // CSV helpers --------------------------------------------------------------
  const handleExportCSV = () => exportSelectedLeads(leads, selection);

  const handleImportCSV = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const parsed = await parseCsvFile(file);
        await importLeads(parsed);
      } catch (error: any) {
        toast.error(error.message || "Unable to import CSV");
      }
    };
    input.click();
  };

  // List of tags to render as pills
  const renderTags = useMemo(() => (
    <div className="flex flex-wrap gap-2">
      {filterTags.map((tag) => (
        <span key={tag} className="px-2 py-1 bg-slate-200 dark:bg-slate-800 rounded-full text-xs flex items-center gap-1">
          {tag}
          <button onClick={() => setFilterTags((prev) => prev.filter((t) => t !== tag))}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  ), [filterTags]);

  // AI chat send button uses backend-aware generator from the hook.
  const handleSendMessage = async () => {
    if (!aiPrompt.trim()) return;
    await generateLeads(aiPrompt);
    setAiPrompt("");
  };

  // Stripe checkout launcher for top-ups.
  const startCheckout = async () => {
    if (!accessToken) return;
    try {
      const session = await api.createCheckoutSession(accessToken, topUpAmount, topUpCredits);
      window.location.href = session.url;
    } catch (error) {
      toast.error("Unable to start checkout");
    }
  };

  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div>
            <div className="text-sm text-slate-500">Lead Console</div>
            <div className="text-lg font-semibold">Hello {userEmail}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDashboardOpen(true)}>
            Credits: {credits}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setSettingsModalOpen(true)}>
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar for lists and filters */}
        <aside className={`${sidebarOpen ? "w-80" : "w-16"} transition-all duration-300 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hidden md:block`}>
          <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
            <div className="font-semibold">Workspace</div>
            <button onClick={() => setSidebarOpen((prev) => !prev)}>
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {sidebarOpen && (
            <div className="p-4 space-y-6">
              <Accordion type="single" collapsible defaultValue="lists">
                <AccordionItem value="lists">
                  <AccordionTrigger className="text-sm font-semibold">Saved Lists</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {savedLists.map((list) => (
                        <div key={list.id} className={`p-2 rounded border flex items-center justify-between ${activeListId === list.id ? "border-blue-500" : "border-slate-200 dark:border-slate-700"}`}>
                          <button className="text-left" onClick={() => applyList(list.id)}>
                            <div className="font-medium">{list.name}</div>
                          </button>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditList(list)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteList(list.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button className="w-full" size="sm" onClick={() => setListModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" /> New List
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Accordion type="single" collapsible defaultValue="filters">
                <AccordionItem value="filters">
                  <AccordionTrigger className="text-sm font-semibold">Saved Filters</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {savedFilters.map((filter) => (
                        <div key={filter.id} className={`p-2 rounded border flex items-center justify-between ${activeFilterId === filter.id ? "border-blue-500" : "border-slate-200 dark:border-slate-700"}`}>
                          <button className="text-left" onClick={() => applyFilter(filter.id)}>
                            <div className="font-medium">{filter.name}</div>
                          </button>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditFilter(filter)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteFilter(filter.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button className="w-full" size="sm" onClick={() => setFilterModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" /> New Filter
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </aside>

        {/* Mobile drawer for workspace */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setMobileMenuOpen(false)}>
            <div className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-900 p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold">Workspace</div>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <div className="text-sm font-semibold mb-2">Saved Lists</div>
                  <div className="space-y-2">
                    {savedLists.map((list) => (
                      <button key={list.id} className="block w-full text-left p-2 rounded border border-slate-200 dark:border-slate-700" onClick={() => applyList(list.id)}>
                        {list.name}
                      </button>
                    ))}
                    <Button className="w-full" size="sm" onClick={() => setListModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" /> New List
                    </Button>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-2">Saved Filters</div>
                  <div className="space-y-2">
                    {savedFilters.map((filter) => (
                      <button key={filter.id} className="block w-full text-left p-2 rounded border border-slate-200 dark:border-slate-700" onClick={() => applyFilter(filter.id)}>
                        {filter.name}
                      </button>
                    ))}
                    <Button className="w-full" size="sm" onClick={() => setFilterModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" /> New Filter
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6 flex flex-col">
          <LeadToolbar
            search={search}
            sortOrder={sortOrder}
            onSearch={(value) => {
              setSearch(value);
              goToPage(1);
            }}
            onSortChange={setSortOrder}
            onExport={handleExportCSV}
            onImport={handleImportCSV}
          />

          {paginatedLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <div className="text-slate-500 dark:text-slate-400">
                <p className="text-lg font-medium mb-2">No leads selected</p>
                <p className="text-sm">Use a saved list or filter, or import CSV data.</p>
              </div>
            </div>
          ) : (
            <LeadTable
              leads={paginatedLeads}
              totalLeads={leads.length}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              onUnlockEmail={(id) => unlock(id, "email")}
              onUnlockPhone={(id) => unlock(id, "phone")}
              selection={selection}
            />
          )}
        </main>
      </div>

      {/* Dashboard Modal */}
      <Dialog open={dashboardOpen} onOpenChange={setDashboardOpen}>
        <DialogContent className="dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-6 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <div className="text-4xl font-bold text-slate-900 dark:text-white">{credits}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Available Credits</div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Unlock Email</span>
                <span className="font-semibold">1 credit</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Unlock Phone</span>
                <span className="font-semibold">2 credits</span>
              </div>
              <div className="flex justify-between text-slate-700 dark:text-slate-300">
                <span>Generate 10 Leads</span>
                <span className="font-semibold">5 credits</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold">Top up credits</div>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" value={topUpCredits} onChange={(e) => setTopUpCredits(parseInt(e.target.value, 10) || 0)} placeholder="Credits" />
                <Input type="number" value={topUpAmount} onChange={(e) => setTopUpAmount(parseInt(e.target.value, 10) || 0)} placeholder="Amount (cents)" />
              </div>
              <Button className="w-full" onClick={startCheckout}>Start checkout (card/Apple Pay)</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit List Modal */}
      <Dialog open={listModalOpen} onOpenChange={setListModalOpen}>
        <DialogContent className="dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>{editingListId ? "Update List" : "Add List"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter list name"
              className="dark:bg-slate-800 dark:border-slate-700"
              value={listNameInput}
              onChange={(e) => setListNameInput(e.target.value)}
            />
            <div className="text-sm text-slate-600 dark:text-slate-400">{selectedCount} leads selected</div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleAddOrUpdateList}>
                {editingListId ? "Update List" : "Save List"}
              </Button>
              <Button className="flex-1" variant="outline" onClick={() => setListModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Filter Modal */}
      <Dialog open={filterModalOpen} onOpenChange={setFilterModalOpen}>
        <DialogContent className="dark:bg-slate-900 max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFilterId ? "Update Filter" : "Save Filter"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Filter name"
              className="dark:bg-slate-800 dark:border-slate-700"
              value={filterNameInput}
              onChange={(e) => setFilterNameInput(e.target.value)}
            />
            <div>
              <div className="text-sm font-semibold mb-2">Countries</div>
              <div className="flex flex-wrap gap-2">
                {COUNTRIES.map((country) => (
                  <button
                    key={country}
                    className={`px-3 py-1 rounded-full text-xs border ${filterCountries.includes(country) ? "bg-blue-600 text-white" : "border-slate-300 dark:border-slate-700"}`}
                    onClick={() =>
                      setFilterCountries((prev) =>
                        prev.includes(country) ? prev.filter((c) => c !== country) : [...prev, country]
                      )
                    }
                  >
                    {country}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">Industries</div>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map((industry) => (
                  <button
                    key={industry}
                    className={`px-3 py-1 rounded-full text-xs border ${filterIndustries.includes(industry) ? "bg-blue-600 text-white" : "border-slate-300 dark:border-slate-700"}`}
                    onClick={() =>
                      setFilterIndustries((prev) =>
                        prev.includes(industry) ? prev.filter((c) => c !== industry) : [...prev, industry]
                      )
                    }
                  >
                    {industry}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">Tags</div>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Add tag"
                  className="dark:bg-slate-800 dark:border-slate-700"
                  value={filterTagInput}
                  onChange={(e) => setFilterTagInput(e.target.value)}
                />
                <Button onClick={handleAddFilterTag}>Add</Button>
              </div>
              {renderTags}
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleSaveFilter}>
                {editingFilterId ? "Update Filter" : "Save Filter"}
              </Button>
              <Button className="flex-1" variant="outline" onClick={() => setFilterModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
        <DialogContent className="dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <p>Use this panel to seed data from the backend CSV or clear selections.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={importSeed}>
                Load seed CSV
              </Button>
              <Button variant="outline" onClick={clearSelection}>
                Clear selections
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Chat Drawer */}
      <Dialog open={aiChatOpen} onOpenChange={setAiChatOpen}>
        <DialogContent className="dark:bg-slate-900 max-w-lg">
          <DialogHeader>
            <DialogTitle>AI Lead Assistant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`p-3 rounded-lg ${msg.role === "assistant" ? "bg-slate-100 dark:bg-slate-800" : "bg-blue-50 dark:bg-blue-900/40"}`}>
                  <div className="text-xs uppercase text-slate-500 mb-1">{msg.role}</div>
                  <div className="text-sm">{msg.content}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ask for new leads..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="dark:bg-slate-800 dark:border-slate-700"
              />
              <Button onClick={handleSendMessage}>
                <Send className="h-4 w-4 mr-2" /> Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
