export type ViewMode = "grid" | "list";
export type SortField = "price" | "date";
export type SortDirection = "asc" | "desc";

export interface FilterChip {
  label: string;
  onClear: () => void;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface PresetOption {
  label: string;
  params: Record<string, string>;
}
