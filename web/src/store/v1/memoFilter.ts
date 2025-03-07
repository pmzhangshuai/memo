import { uniqBy } from "lodash-es";
import { create } from "zustand";
import { combine } from "zustand/middleware";

export type FilterFactor =
  | "tagSearch"
  | "visibility"
  | "contentSearch"
  | "displayTime"
  | "property.hasLink"
  | "property.hasTaskList"
  | "property.hasCode"
  | "resources";

export interface MemoFilter {
  factor: FilterFactor;
  value: string;
}

export const getMemoFilterKey = (filter: MemoFilter) => `${filter.factor}:${filter.value}`;

export const parseFilterQuery = (query: string | null): MemoFilter[] => {
  if (!query) return [];
  try {
    return query.split(",").map((filterStr) => {
      const [factor, value] = filterStr.split(":");
      return {
        factor: factor as FilterFactor,
        value: decodeURIComponent(value),
      };
    });
  } catch (error) {
    console.error("Failed to parse filter query:", error);
    return [];
  }
};

export const stringifyFilters = (filters: MemoFilter[]): string => {
  return filters.map((filter) => `${filter.factor}:${encodeURIComponent(filter.value)}`).join(",");
};

export type CommentOrder =
  | "asc"
  | "desc"
  | "default";

export interface State {
  filters: MemoFilter[];
  orderByTimeAsc: boolean;
  orderByComment: CommentOrder;
  orderByReactions: CommentOrder;
  // The id of selected shortcut.
  shortcut?: string;
}

const getInitialState = (): State => {
  const searchParams = new URLSearchParams(window.location.search);
  return {
    filters: parseFilterQuery(searchParams.get("filter")),
    orderByTimeAsc: searchParams.get("orderByTime") === "asc",
    orderByComment: searchParams.get("orderByComment") === "asc" ? "asc" : searchParams.get("orderByComment") === "desc" ? "desc" : "default",
    orderByReactions: searchParams.get("orderByReactions") === "asc" ? "asc" : searchParams.get("orderByReactions") === "desc" ? "desc" : "default",
  };
};

export const useMemoFilterStore = create(
  combine(getInitialState(), (set, get) => ({
    setState: (state: State) => set(state),
    getState: () => get(),
    getFiltersByFactor: (factor: FilterFactor) => get().filters.filter((f) => f.factor === factor),
    addFilter: (filter: MemoFilter) => set((state) => ({ filters: uniqBy([...state.filters, filter], getMemoFilterKey) })),
    removeFilter: (filterFn: (f: MemoFilter) => boolean) => set((state) => ({ filters: state.filters.filter((f) => !filterFn(f)) })),
    setOrderByTimeAsc: (orderByTimeAsc: boolean) => set({ orderByTimeAsc }),
    setShortcut: (shortcut?: string) => set({ shortcut }),
  })),
);
