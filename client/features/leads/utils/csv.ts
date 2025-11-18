import type { Lead } from "../types";
import { toast } from "sonner";
import { useLeadsSelection } from "@/hooks/useLeadsSelection";

const EXPECTED_HEADERS = ["Name", "Industry", "Location", "Email", "Phone", "Website"];

export const exportSelectedLeads = (
  leads: Lead[],
  selection: ReturnType<typeof useLeadsSelection>
) => {
  if (selection.getSelectedCount() === 0) {
    toast.error("Please select at least one lead to export");
    return;
  }

  const selectedLeads = leads.filter((lead) => selection.isSelected(lead.id));
  const headers = EXPECTED_HEADERS;
  const rows = selectedLeads.map((lead) => [
    lead.name,
    lead.industry,
    lead.location,
    lead.emailUnlocked ? lead.email : "Locked",
    lead.phoneUnlocked ? lead.phone : "Locked",
    lead.website,
  ]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "leads.csv";
  a.click();
  toast.success(`Exported ${selectedLeads.length} leads`);
};

export const parseCsvFile = async (file: File): Promise<Partial<Lead>[]> => {
  const text = await file.text();
  const lines = text.trim().split("\n");

  if (lines.length < 2) {
    throw new Error("CSV file must contain headers and at least one row");
  }

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const headerMatch = headers.every((h) => EXPECTED_HEADERS.includes(h));
  if (!headerMatch) {
    throw new Error("CSV headers don't match the expected format");
  }

  const imported: Partial<Lead>[] = [];

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
        values.push(current.trim().replace(/^"|"$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ""));

    if (values.length !== EXPECTED_HEADERS.length) {
      continue;
    }

    const [name, industry, location, email, phone, website] = values;
    imported.push({
      name,
      industry,
      location,
      email,
      phone,
      website,
      source: "import",
    });
  }

  return imported;
};
