import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LeadToolbarProps {
  search: string;
  sortOrder: "asc" | "desc";
  onSearch: (value: string) => void;
  onSortChange: (value: "asc" | "desc") => void;
  onExport: () => void;
  onImport: () => void;
}

// Reusable toolbar for search, sort, and CSV import/export so the Index page
// only orchestrates data and keeps UI concerns isolated.
export const LeadToolbar: React.FC<LeadToolbarProps> = ({
  search,
  sortOrder,
  onSearch,
  onSortChange,
  onExport,
  onImport,
}) => {
  return (
    <div className="mb-6 space-y-4 md:space-y-0 md:flex md:items-center md:gap-4">
      <div className="flex-1">
        <Input
          placeholder="Search by name, location, or industry"
          className="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <div className="flex gap-2 flex-wrap">
        <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => onSortChange(value)}>
          <SelectTrigger className="w-24">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Name A-Z</SelectItem>
            <SelectItem value="desc">Name Z-A</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={onExport}>
          <ArrowUp className="h-4 w-4 mr-2" /> Export
        </Button>
        <Button variant="outline" size="sm" onClick={onImport}>
          <ArrowDown className="h-4 w-4 mr-2" /> Import
        </Button>
      </div>
    </div>
  );
};
