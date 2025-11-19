import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Lead } from "../types";
import { useMemo } from "react";
import { useLeadsSelection } from "@/hooks/useLeadsSelection";

interface LeadTableProps {
  leads: Lead[];
  totalLeads: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onUnlockEmail: (id: number) => void;
  onUnlockPhone: (id: number) => void;
  selection: ReturnType<typeof useLeadsSelection>;
}

// Standalone table component to keep Index.tsx focused on data orchestration.
// Handles row selection, unlock buttons, and pagination controls.
export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  totalLeads,
  currentPage,
  totalPages,
  onPageChange,
  onUnlockEmail,
  onUnlockPhone,
  selection,
}) => {
  const start = useMemo(() => (currentPage - 1) * 10, [currentPage]);
  const end = useMemo(() => start + leads.length, [start, leads.length]);
  const allCurrentPageSelected = leads.length > 0 && leads.every((lead) => selection.isSelected(lead.id));
  const selectedCount = selection.getSelectedCount();

  const handleSelectAllOnPage = () => {
    if (allCurrentPageSelected) {
      leads.forEach((lead) => selection.deselectLead(lead.id));
    } else {
      leads.forEach((lead) => selection.selectLead(lead.id));
    }
  };

  return (
    <>
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        SELECTED LEADS: {selectedCount} / TOTAL RECORDS: {totalLeads}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 flex-1">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="w-12 px-4 py-3 text-left">
                <Checkbox checked={allCurrentPageSelected} onCheckedChange={handleSelectAllOnPage} />
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
            {leads.map((lead) => (
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
                      onClick={() => onUnlockEmail(lead.id)}
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
                      onClick={() => onUnlockPhone(lead.id)}
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

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Showing {start + 1} to {end} of {totalLeads} results
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
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
                  onClick={() => onPageChange(pageNum)}
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
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </>
  );
};
