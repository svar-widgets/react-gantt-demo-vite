import { createContext, useContext } from "react";
import { ganttStore, type GanttStore } from "./ganttStore";

const GanttStoreContext = createContext<GanttStore | null>(null);

export const GanttStoreProvider = GanttStoreContext.Provider;

export function useGanttStore(): GanttStore {
  const store = useContext(GanttStoreContext);
  if (!store) {
    throw new Error("useGanttStore must be used within a GanttStoreProvider");
  }
  return store;
}

export { ganttStore };
export type { GanttStore };
