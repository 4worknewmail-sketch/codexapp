import { useState, useCallback } from "react";

interface Lead {
  id: number;
}

/**
 * Hook for managing lead selection across multiple pages
 * Tracks selected lead IDs across all pages, not just current page
 */
export function useLeadsSelection() {
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set());

  const selectLead = useCallback((leadId: number) => {
    setSelectedLeadIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  }, []);

  const selectMultiple = useCallback((leadIds: number[]) => {
    setSelectedLeadIds(prev => {
      const newSet = new Set(prev);
      leadIds.forEach(id => newSet.add(id));
      return newSet;
    });
  }, []);

  const deselectMultiple = useCallback((leadIds: number[]) => {
    setSelectedLeadIds(prev => {
      const newSet = new Set(prev);
      leadIds.forEach(id => newSet.delete(id));
      return newSet;
    });
  }, []);

  const selectAll = useCallback((leads: Lead[]) => {
    const newSet = new Set(leads.map(l => l.id));
    setSelectedLeadIds(newSet);
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedLeadIds(new Set());
  }, []);

  const toggleSelectAll = useCallback((leads: Lead[], allSelected: boolean) => {
    if (allSelected) {
      deselectAll();
    } else {
      selectAll(leads);
    }
  }, [selectAll, deselectAll]);

  const isSelected = useCallback((leadId: number) => {
    return selectedLeadIds.has(leadId);
  }, [selectedLeadIds]);

  const getSelectedLeadIds = useCallback(() => {
    return Array.from(selectedLeadIds);
  }, [selectedLeadIds]);

  const getSelectedCount = useCallback(() => {
    return selectedLeadIds.size;
  }, [selectedLeadIds]);

  const clear = useCallback(() => {
    setSelectedLeadIds(new Set());
  }, []);

  return {
    selectedLeadIds,
    selectLead,
    selectMultiple,
    deselectMultiple,
    selectAll,
    deselectAll,
    toggleSelectAll,
    isSelected,
    getSelectedLeadIds,
    getSelectedCount,
    clear,
  };
}
