import { useState, useEffect } from "react";
import { Menu, X, Settings, ArrowUp, ArrowDown, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit } from "lucide-react";
import { useLeadsSelection } from "@/hooks/useLeadsSelection";

interface Lead {
  id: number;
  name: string;
  industry: string;
  location: string;
  email: string;
  phone: string;
  website: string;
  emailUnlocked: boolean;
  phoneUnlocked: boolean;
  isImported?: boolean;
}

interface SavedList {
  id: string;
  name: string;
  leads: Lead[];
  createdAt: number;
}

interface Filter {
  countries: string[];
  industries: string[];
  tags: string[];
}

interface SavedFilter {
  id: string;
  name: string;
  filters: Filter;
  createdAt: number;
}

const INDUSTRIES = [
  "Administrative Services", "Advertising", "Aerospace", "Agriculture", "Airlines",
  "Amusement & Recreation", "Banking", "Business Services", "Chemicals", "Construction",
  "Consumer Discretionary", "Consumer Services", "Creative Industries", "Education", "Energy",
  "Entertainment", "Environment", "Fashion", "Fishing", "Food", "Manufacturing", "Forestry",
  "Healthcare", "Heavy Industry", "Hotels", "Industrial Manufacturing", "Information Technology",
  "Infrastructure", "Insurance", "Life Sciences", "Logistics", "Marketing Services", "Materials",
  "Media", "Mining", "Professional Services", "Publishing", "Real Estate", "Restaurants", "Retail",
  "Science & Technology", "Social Services", "Space", "Sports & Leisure", "Telecom", "Textiles",
  "Tourism", "Transportation", "Utilities", "Waste Management", "Water", "Wholesale", "Cultural Industries"
];

const COUNTRIES = [
  "United States", "Canada", "UK", "Australia", "Sweden", "Mexico", "India", "Japan", "Germany",
  "France", "Netherlands", "Spain", "Singapore", "Hong Kong", "South Korea", "Thailand",
  "Philippines", "Indonesia", "Vietnam", "Pakistan", "Bangladesh", "Nigeria", "Egypt"
];

const FIRST_NAMES = [
  "James", "Floyd", "Ronald", "Marvin", "Jerome", "Kathryn", "Jacobo", "Kristin", "Sarah",
  "Michael", "Emily", "David", "Jessica", "Christopher", "Amanda", "Daniel", "Laura", "Matthew",
  "Sophie", "Andrew", "Elizabeth", "Ryan", "Michelle", "Kevin", "Jennifer", "Brandon", "Ashley",
  "Justin", "Nicole", "Tyler", "Anna", "Robert", "Lisa", "Mary", "Patricia"
];

const LAST_NAMES = [
  "Cooper", "Miles", "Richards", "McKinney", "Bell", "Murphy", "Jones", "Watson", "Johnson",
  "Brown", "Wilson", "Davis", "Martinez", "Lee", "Taylor", "Anderson", "Thomas", "Jackson",
  "White", "Harris", "Martin", "Thompson", "Garcia", "Rodriguez", "Kim", "Chen", "Park", "Evans",
  "Smith", "Williams", "Miller"
];

const generateMockLeads = (): Lead[] => {
  let id = 1;
  const leads: Lead[] = [];
  
  INDUSTRIES.forEach(industry => {
    for (let i = 0; i < 10; i++) {
      const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
      
      leads.push({
        id,
        name: `${firstName} ${lastName}`,
        industry,
        location: country,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
        phone: `(${Math.floor(Math.random() * 900) + 100}) 555-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`,
        website: `${lastName.toLowerCase()}.com`,
        emailUnlocked: false,
        phoneUnlocked: false,
      });
      id++;
    }
  });
  
  return leads;
};

const MOCK_LEADS = generateMockLeads();

export default function Index() {
  // Selection state
  const selection = useLeadsSelection();

  // Core data state - SINGLE SOURCE OF TRUTH
  const [allLeads, setAllLeads] = useState<Lead[]>(MOCK_LEADS);
  const [displayedLeads, setDisplayedLeads] = useState<Lead[]>([]);
  const [credits, setCredits] = useState(1000);
  const [savedLists, setSavedLists] = useState<SavedList[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  
  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const pageSize = 10;

  // Chat state
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Need any help? Start chat now..." }
  ]);
  const [aiPrompt, setAiPrompt] = useState("");

  // Modal states
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [listNameInput, setListNameInput] = useState("");
  const [filterNameInput, setFilterNameInput] = useState("");
  const [filterCountries, setFilterCountries] = useState<string[]>([]);
  const [filterIndustries, setFilterIndustries] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterTagInput, setFilterTagInput] = useState("");
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);

  // Load state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("leads-app-state");
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.allLeads) setAllLeads(state.allLeads);
        if (state.savedLists) setSavedLists(state.savedLists);
        if (state.savedFilters) setSavedFilters(state.savedFilters);
        if (state.credits) setCredits(state.credits);
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem("leads-app-state", JSON.stringify({
      allLeads,
      savedLists,
      savedFilters,
      credits,
    }));
  }, [allLeads, savedLists, savedFilters, credits]);

  // Filter and sort leads
  const filteredLeads = displayedLeads.filter(lead => {
    const matchesSearch = search === "" || 
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.location.toLowerCase().includes(search.toLowerCase()) ||
      lead.industry.toLowerCase().includes(search.toLowerCase());
    
    return matchesSearch;
  });

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    if (sortOrder === "asc") {
      return a.name.localeCompare(b.name);
    }
    return b.name.localeCompare(a.name);
  });

  // Pagination
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const paginatedLeads = sortedLeads.slice(start, end);
  const totalPages = Math.ceil(sortedLeads.length / pageSize);

  // Selection helpers
  const selectedCount = selection.getSelectedCount();
  const allCurrentPageSelected = paginatedLeads.length > 0 && paginatedLeads.every(l => selection.isSelected(l.id));

  // Handle unlock with credit deduction
  const handleUnlockEmail = (leadId: number) => {
    if (credits < 1) {
      toast.error("Not enough credits to unlock email");
      return;
    }
    setAllLeads(prev => prev.map(lead =>
      lead.id === leadId ? { ...lead, emailUnlocked: true } : lead
    ));
    setDisplayedLeads(prev => prev.map(lead =>
      lead.id === leadId ? { ...lead, emailUnlocked: true } : lead
    ));
    setCredits(prev => prev - 1);
    toast.success("Email unlocked (–1 credit)");
  };

  const handleUnlockPhone = (leadId: number) => {
    if (credits < 2) {
      toast.error("Not enough credits to unlock phone");
      return;
    }
    setAllLeads(prev => prev.map(lead =>
      lead.id === leadId ? { ...lead, phoneUnlocked: true } : lead
    ));
    setDisplayedLeads(prev => prev.map(lead =>
      lead.id === leadId ? { ...lead, phoneUnlocked: true } : lead
    ));
    setCredits(prev => prev - 2);
    toast.success("Phone unlocked (–2 credits)");
  };

  // AI generation
  const handleSendMessage = () => {
    if (!aiPrompt.trim()) return;

    setChatMessages(prev => [...prev, { role: "user", content: aiPrompt }]);

    if (credits < 5) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Not enough credits to generate leads. You need 5 credits." }]);
    } else {
      let maxId = Math.max(...allLeads.map(l => l.id), 0);
      const newLeads = Array.from({ length: 10 }, (_, i) => ({
        id: maxId + i + 1,
        name: `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`,
        industry: INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)],
        location: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
        email: `lead${Math.random().toString(36).substring(7)}@example.com`,
        phone: `(${Math.floor(Math.random() * 900) + 100}) 555-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`,
        website: `example${Math.random().toString(36).substring(7)}.com`,
        emailUnlocked: false,
        phoneUnlocked: false,
      }));
      
      setAllLeads(prev => [...prev, ...newLeads]);
      setDisplayedLeads(prev => [...prev, ...newLeads]);
      setCredits(prev => prev - 5);
      setChatMessages(prev => [...prev, { role: "assistant", content: "✅ Generated 10 new leads for you! (–5 credits)" }]);
      toast.success("10 new leads generated (–5 credits)");
    }

    setAiPrompt("");
  };

  // List management
  const handleAddOrUpdateList = () => {
    if (!listNameInput.trim()) {
      toast.error("Please enter a list name");
      return;
    }
    if (selectedCount === 0) {
      toast.error("Please select at least one lead");
      return;
    }

    const selectedLeads = allLeads.filter(l => selection.isSelected(l.id));

    if (editingListId) {
      // Update existing list
      setSavedLists(prev => prev.map(list =>
        list.id === editingListId
          ? { ...list, name: listNameInput, leads: selectedLeads, createdAt: Date.now() }
          : list
      ));
      toast.success("List updated");
      setEditingListId(null);
    } else {
      // Create new list
      const newList: SavedList = {
        id: Date.now().toString(),
        name: listNameInput,
        leads: selectedLeads,
        createdAt: Date.now(),
      };
      setSavedLists(prev => [...prev, newList]);
      toast.success("List saved");
    }

    setListNameInput("");
    selection.clear();
    setListModalOpen(false);
  };

  const handleClickList = (listId: string) => {
    const list = savedLists.find(l => l.id === listId);
    if (list) {
      setActiveListId(listId);
      setActiveFilterId(null);
      setDisplayedLeads(list.leads);
      setCurrentPage(1);
      selection.clear();
    }
  };

  const handleDeleteList = (listId: string) => {
    setSavedLists(prev => prev.filter(l => l.id !== listId));
    if (activeListId === listId) {
      setActiveListId(null);
      setDisplayedLeads([]);
    }
    toast.success("List deleted");
  };

  const handleEditList = (listId: string) => {
    const list = savedLists.find(l => l.id === listId);
    if (list) {
      setEditingListId(listId);
      setListNameInput(list.name);
      setListModalOpen(true);
    }
  };

  // Filter management
  const handleAddOrUpdateFilter = () => {
    if (filterCountries.length === 0 && filterIndustries.length === 0 && filterTags.length === 0) {
      toast.error("Please select at least one filter criterion");
      return;
    }

    const filtered = allLeads.filter(lead => {
      const matchesCountries = filterCountries.length === 0 || filterCountries.includes(lead.location);
      const matchesIndustries = filterIndustries.length === 0 || filterIndustries.includes(lead.industry);
      return matchesCountries && matchesIndustries;
    });

    if (editingFilterId) {
      // Update existing filter
      setSavedFilters(prev => prev.map(filter =>
        filter.id === editingFilterId
          ? {
              ...filter,
              name: filterNameInput || `Filter ${new Date().toLocaleDateString()}`,
              filters: { countries: filterCountries, industries: filterIndustries, tags: filterTags },
              createdAt: Date.now(),
            }
          : filter
      ));
      toast.success("Filter updated");
    } else {
      // Create new filter
      const newFilter: SavedFilter = {
        id: Date.now().toString(),
        name: filterNameInput || `Filter ${new Date().toLocaleDateString()}`,
        filters: { countries: filterCountries, industries: filterIndustries, tags: filterTags },
        createdAt: Date.now(),
      };
      setSavedFilters(prev => [...prev, newFilter]);
      toast.success("Filter saved");
    }

    setDisplayedLeads(filtered);
    setActiveListId(null);
    setActiveFilterId(editingFilterId || Date.now().toString());
    setCurrentPage(1);
    selection.clear();
    setFilterNameInput("");
    setFilterCountries([]);
    setFilterIndustries([]);
    setFilterTags([]);
    setEditingFilterId(null);
    setFilterModalOpen(false);
  };

  const handleClickFilter = (filterId: string) => {
    const filter = savedFilters.find(f => f.id === filterId);
    if (filter) {
      setActiveFilterId(filterId);
      setActiveListId(null);
      setFilterCountries(filter.filters.countries);
      setFilterIndustries(filter.filters.industries);
      setFilterTags(filter.filters.tags);
      const filtered = allLeads.filter(lead => {
        const matchesCountries = filter.filters.countries.length === 0 || filter.filters.countries.includes(lead.location);
        const matchesIndustries = filter.filters.industries.length === 0 || filter.filters.industries.includes(lead.industry);
        return matchesCountries && matchesIndustries;
      });
      setDisplayedLeads(filtered);
      setCurrentPage(1);
      selection.clear();
    }
  };

  const handleEditFilter = (filterId: string) => {
    const filter = savedFilters.find(f => f.id === filterId);
    if (filter) {
      setEditingFilterId(filterId);
      setFilterNameInput(filter.name);
      setFilterCountries(filter.filters.countries);
      setFilterIndustries(filter.filters.industries);
      setFilterTags(filter.filters.tags);
      setFilterModalOpen(true);
    }
  };

  const handleDeleteFilter = (filterId: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== filterId));
    if (activeFilterId === filterId) {
      setActiveFilterId(null);
      setDisplayedLeads([]);
    }
    toast.success("Filter deleted");
  };

  const handleAddFilterTag = () => {
    if (filterTagInput.trim() && !filterTags.includes(filterTagInput.trim())) {
      setFilterTags(prev => [...prev, filterTagInput.trim()]);
      setFilterTagInput("");
    }
  };

  const handleRemoveFilterTag = (tag: string) => {
    setFilterTags(prev => prev.filter(t => t !== tag));
  };

  // Export - ALL SELECTED LEADS
  const handleExportCSV = () => {
    if (selectedCount === 0) {
      toast.error("Please select at least one lead to export");
      return;
    }

    const selectedLeads = allLeads.filter(l => selection.isSelected(l.id));
    const headers = ["Name", "Industry", "Location", "Email", "Phone", "Website"];
    const rows = selectedLeads.map(lead => [
      lead.name,
      lead.industry,
      lead.location,
      lead.emailUnlocked ? lead.email : "Locked",
      lead.phoneUnlocked ? lead.phone : "Locked",
      lead.website,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.csv";
    a.click();
    toast.success(`Exported ${selectedLeads.length} leads`);
  };

  // Import CSV
  const handleImportCSV = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";

    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const lines = text.trim().split("\n");

        if (lines.length < 2) {
          toast.error("CSV file must contain headers and at least one row");
          return;
        }

        const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
        const expectedHeaders = ["Name", "Industry", "Location", "Email", "Phone", "Website"];

        const headerMatch = headers.every(h => expectedHeaders.includes(h));
        if (!headerMatch) {
          toast.error("CSV headers don't match the expected format");
          return;
        }

        const importedLeads: Lead[] = [];
        let maxId = Math.max(...allLeads.map(l => l.id), 0);

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values: string[] = [];
          let current = "";
          let inQuotes = false;

          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === "," && !inQuotes) {
              values.push(current.replace(/^"|"$/g, "").trim());
              current = "";
            } else {
              current += char;
            }
          }
          values.push(current.replace(/^"|"$/g, "").trim());

          if (values.length >= 6) {
            const [name, industry, location, email, phone, website] = values.slice(0, 6);

            if (name) {
              maxId++;
              importedLeads.push({
                id: maxId,
                name,
                industry,
                location,
                email,
                phone,
                website,
                emailUnlocked: email !== "Locked",
                phoneUnlocked: phone !== "Locked",
                isImported: true,
              });
            }
          }
        }

        if (importedLeads.length === 0) {
          toast.error("No valid leads found in the CSV file");
          return;
        }

        setAllLeads(prev => [...prev, ...importedLeads]);
        setDisplayedLeads(prev => [...prev, ...importedLeads]);
        toast.success(`${importedLeads.length} lead(s) imported successfully`);
      } catch (error) {
        toast.error("Failed to import CSV file");
        console.error("Import error:", error);
      }
    };

    input.click();
  };

  // Select all on current page
  const handleSelectAllOnPage = () => {
    if (allCurrentPageSelected) {
      selection.deselectMultiple(paginatedLeads.map(l => l.id));
    } else {
      selection.selectMultiple(paginatedLeads.map(l => l.id));
    }
  };

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row">
      {/* Sidebar */}
      <div
        className={`fixed md:relative w-64 h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-white overflow-y-auto transition-transform duration-300 z-40 border-r border-slate-200 dark:border-slate-800 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-6">
          {/* Logo */}
          <div className="mb-8 mt-8 md:mt-0">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2F61e03672c0e44ebf9f94811b1213f9ac%2F96053f2a4c5048c983e108bfbfc98060?format=webp&width=200"
              alt="Automated AI Outreach"
              className="w-40 h-auto mx-auto"
            />
          </div>

          {/* Navigation */}
          <nav className="space-y-3">
            <Button
              variant="default"
              className="w-full justify-start bg-slate-700 hover:bg-slate-600 text-white"
              onClick={() => {
                setDashboardOpen(true);
                setMobileMenuOpen(false);
              }}
            >
              📊 Dashboard
            </Button>

            <Button
              className="w-full justify-start bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => {
                setAiChatOpen(true);
                setMobileMenuOpen(false);
              }}
            >
              ✨ Generate with AI
            </Button>

            {/* Lists Section */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="lists" className="border-none">
                <AccordionTrigger className="py-2 px-3 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-medium">
                  📋 Lists
                </AccordionTrigger>
                <AccordionContent className="mt-2 space-y-2 pb-0">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    {savedLists.length > 0 ? (
                      <div className="space-y-2">
                        {savedLists.map(list => (
                          <div
                            key={list.id}
                            className="flex items-center justify-between bg-slate-200 dark:bg-slate-700 p-2 rounded cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-600"
                            onClick={() => handleClickList(list.id)}
                          >
                            <span className="flex-1 truncate">{list.name}</span>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-slate-300 dark:hover:bg-slate-600"
                                title="Edit list"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditList(list.id);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-slate-300 dark:hover:bg-slate-600"
                                title="Delete list"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteList(list.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      "No lists yet"
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      setEditingListId(null);
                      setListNameInput("");
                      setListModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add List
                  </Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Profile+ Section */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="filters" className="border-none">
                <AccordionTrigger className="py-2 px-3 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-medium">
                  ⚙️ Profile+
                </AccordionTrigger>
                <AccordionContent className="mt-2 space-y-2 pb-0">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    {savedFilters.length > 0 ? (
                      <div className="space-y-2">
                        {savedFilters.map(filter => (
                          <div
                            key={filter.id}
                            className="flex items-center justify-between bg-slate-200 dark:bg-slate-700 p-2 rounded cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-600"
                            onClick={() => handleClickFilter(filter.id)}
                          >
                            <span className="flex-1 truncate">{filter.name}</span>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-slate-300 dark:hover:bg-slate-600"
                                title="Edit filter"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditFilter(filter.id);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-slate-300 dark:hover:bg-slate-600"
                                title="Delete filter"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFilter(filter.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      "No filters yet"
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      setEditingFilterId(null);
                      setFilterNameInput("");
                      setFilterCountries([]);
                      setFilterIndustries([]);
                      setFilterTags([]);
                      setFilterModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Filter
                  </Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Hello, User 👋</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-slate-200 dark:bg-slate-800 px-4 py-2 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300">
              Available Credits: {credits}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsModalOpen(true)}
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-6 flex flex-col">
          {/* Action Bar */}
          <div className="mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, location, or industry"
                className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Name A-Z</SelectItem>
                  <SelectItem value="desc">Name Z-A</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <ArrowUp className="h-4 w-4 mr-2" /> Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleImportCSV}>
                <ArrowDown className="h-4 w-4 mr-2" /> Import
              </Button>
            </div>
          </div>

          {displayedLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <div className="text-slate-500 dark:text-slate-400">
                <p className="text-lg font-medium mb-2">No leads selected</p>
                <p className="text-sm">Use Profile+ to create a filter or select a list to view leads</p>
              </div>
            </div>
          ) : (
            <>
              {/* Selected Count */}
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                SELECTED LEADS: {selectedCount} / TOTAL RECORDS: {sortedLeads.length}
              </div>

              {/* Leads Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 flex-1">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="w-12 px-4 py-3 text-left">
                        <Checkbox
                          checked={allCurrentPageSelected}
                          onCheckedChange={handleSelectAllOnPage}
                        />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Industry</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Location</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Phone</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Website</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLeads.map((lead) => (
                      <tr key={lead.id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selection.isSelected(lead.id)}
                            onCheckedChange={() => selection.selectLead(lead.id)}
                          />
                        </td>
                        <td className="px-4 py-3 text-slate-900 dark:text-white">{lead.name}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{lead.industry}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{lead.location}</td>
                        <td className="px-4 py-3">
                          {lead.emailUnlocked || lead.isImported ? (
                            <span className="text-slate-600 dark:text-slate-400">{lead.email}</span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-slate-800"
                              onClick={() => handleUnlockEmail(lead.id)}
                            >
                              Click to Unlock
                            </Button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {lead.phoneUnlocked || lead.isImported ? (
                            <span className="text-slate-600 dark:text-slate-400">{lead.phone}</span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800"
                              onClick={() => handleUnlockPhone(lead.id)}
                            >
                              Click to Unlock
                            </Button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{lead.website}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Showing {start + 1} to {Math.min(end, sortedLeads.length)} of {sortedLeads.length} results
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
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
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {selectedCount} leads selected
            </div>
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
            <DialogTitle>{editingFilterId ? "Update Filter" : "Add Filter"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pr-2">
            <Input
              placeholder="Filter name (optional)"
              className="dark:bg-slate-800 dark:border-slate-700"
              value={filterNameInput}
              onChange={(e) => setFilterNameInput(e.target.value)}
            />

            <div>
              <label className="text-sm font-medium">Countries</label>
              <Select value={""} onValueChange={(value) => {
                if (!filterCountries.includes(value)) {
                  setFilterCountries(prev => [...prev, value]);
                }
              }}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 mt-1">
                  <SelectValue placeholder="Add countries" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.filter(c => !filterCountries.includes(c)).map(country => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filterCountries.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {filterCountries.map(country => (
                    <div key={country} className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-sm flex items-center gap-1">
                      {country}
                      <button onClick={() => setFilterCountries(prev => prev.filter(c => c !== country))} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Industries</label>
              <Select value={""} onValueChange={(value) => {
                if (!filterIndustries.includes(value)) {
                  setFilterIndustries(prev => [...prev, value]);
                }
              }}>
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 mt-1">
                  <SelectValue placeholder="Add industries" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.filter(i => !filterIndustries.includes(i)).map(industry => (
                    <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filterIndustries.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {filterIndustries.map(industry => (
                    <div key={industry} className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-sm flex items-center gap-1">
                      {industry}
                      <button onClick={() => setFilterIndustries(prev => prev.filter(i => i !== industry))} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Tags</label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Type tag and press Enter"
                  className="dark:bg-slate-800 dark:border-slate-700"
                  value={filterTagInput}
                  onChange={(e) => setFilterTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddFilterTag();
                    }
                  }}
                />
                <Button onClick={handleAddFilterTag} size="sm">Add</Button>
              </div>
              {filterTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {filterTags.map(tag => (
                    <div key={tag} className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-sm flex items-center gap-1">
                      {tag}
                      <button onClick={() => handleRemoveFilterTag(tag)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white" onClick={handleAddOrUpdateFilter}>
              {editingFilterId ? "Update & Search" : "Search & Save"}
            </Button>
            <Button className="w-full" variant="outline" onClick={() => setFilterModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={settingsModalOpen} onOpenChange={setSettingsModalOpen}>
        <DialogContent className="dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle>Account Settings</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <p className="text-slate-600 dark:text-slate-400">Account Settings Coming Soon</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Chat Modal */}
      <Dialog open={aiChatOpen} onOpenChange={setAiChatOpen}>
        <DialogContent className="dark:bg-slate-900 max-w-2xl h-96 flex flex-col">
          <DialogHeader>
            <DialogTitle>✨ Generate with AI Chat</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-4 flex flex-col space-y-4">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs md:max-w-md px-4 py-3 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-cyan-500 text-white rounded-br-none shadow-md'
                      : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-none shadow-md'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Ask to generate leads..."
                className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white flex-1"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
                onClick={handleSendMessage}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
