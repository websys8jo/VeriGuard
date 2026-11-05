import { create } from "zustand";

export type Source = "all" | "dna" | "jigsaw" | "prosocial";
export type Split = "all" | "dev" | "test";
export type ModelName =
  | "all"
  | "llama_guard_3_1b"
  | "qwen3guard_gen_0_6b"
  | "shieldgemma_2b"
  | "team_judge";
export type Correctness = "all" | "correct" | "wrong";

export interface Filters {
  source: Source;
  split: Split;
  ruleId: string | null; // null = no rule filter
  model: ModelName;
  correctness: Correctness;
}

interface AppState {
  filters: Filters;
  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;

  // cross-view linking: selecting a text in one view highlights it in the others
  selectedTextId: string | null;
  setSelectedTextId: (id: string | null) => void;
}

const defaultFilters: Filters = {
  source: "all",
  split: "all",
  ruleId: null,
  model: "all",
  correctness: "all",
};

export const useAppStore = create<AppState>((set) => ({
  filters: defaultFilters,
  setFilters: (patch) =>
    set((state) => ({ filters: { ...state.filters, ...patch } })),
  resetFilters: () => set({ filters: defaultFilters }),

  selectedTextId: null,
  setSelectedTextId: (id) => set({ selectedTextId: id }),
}));
