# Feature structure overview

The lead-management experience is primarily implemented in a single React component (`client/pages/Index.tsx`). The component currently owns mock data generation, table rendering, selection management, credit-aware unlock flows, CSV import/export, saved lists and filters, and the AI chat interaction. Concentrating everything here makes the file long and harder to maintain.

A more modular approach could split responsibilities into focused components and hooks (for example, moving table controls, dialogs, and CSV utilities into their own files) while keeping shared types in `shared/` and shared UI primitives in `client/components/ui/`. That breakdown would make each feature easier to test, maintain, and evolve while still integrating through props and shared state.
