import { create } from "zustand";
import type { ITask, ILink, TID } from "@svar-ui/gantt-store";

interface GanttState {
  // Data
  tasks: ITask[];
  links: ILink[];
  scales: { unit: string; step: number; format: string }[];

  // UI State
  selectedTaskId: number | null;

  // Actions
  taskSelected: (ev: { id: TID }) => void;
  taskAdded: (ev: { task: Partial<ITask> }) => void;
  taskUpdated: (id: TID, task: Partial<ITask>) => void;
  taskDeleted: (ev: { id: TID }) => void;
  linkAdded: (ev: { link: Partial<ILink> }) => void;
  linkUpdated: (ev: { id: TID; link: Partial<ILink> }) => void;
  linkDeleted: (ev: { id: TID }) => void;
}

export const useGanttStore = create<GanttState>()((set) => ({
  // Initial data
  tasks: [
    {
      id: 1,
      text: "Project Planning",
      start: new Date(2024, 0, 1),
      end: new Date(2024, 3, 12),
      progress: 100,
      type: "summary",
      open: true,
    },
    {
      id: 2,
      text: "Requirements Gathering",
      start: new Date(2024, 0, 1),
      end: new Date(2024, 0, 5),
      progress: 100,
      parent: 1,
    },
    {
      id: 3,
      text: "Design Phase",
      start: new Date(2024, 0, 6),
      end: new Date(2024, 0, 12),
      progress: 60,
      parent: 1,
    },
    {
      id: 4,
      text: "Development",
      start: new Date(2024, 0, 6),
      end: new Date(2024, 3, 12),
      progress: 60,
      parent: 1,
    },
  ],
  links: [{ id: 1, source: 2, target: 3, type: "e2s" }],
  scales: [
    { unit: "month", step: 1, format: "%M %Y" },
    { unit: "week", step: 1, format: "Week %w" },
  ],
  selectedTaskId: null,

  // UI state action - updates store
  taskSelected: ({ id }) => set({ selectedTaskId: id as number }),

  // Persistence actions - these don't modify Zustand state
  // The Gantt component owns the actual data (Stateful Island pattern)
  taskAdded: ({ task }) => {
    console.log("[Persistence] Task added:", task);
    // In a real app: await api.createTask(task);
  },
  taskUpdated: (id, task) => {
    console.log("[Persistence] Task updated:", { id, task });
    // In a real app: await api.updateTask(id, task);
  },
  taskDeleted: ({ id }) => {
    console.log("[Persistence] Task deleted:", id);
    // In a real app: await api.deleteTask(id);
  },
  linkAdded: ({ link }) => {
    console.log("[Persistence] Link added:", link);
    // In a real app: await api.createLink(link);
  },
  linkUpdated: ({ id, link }) => {
    console.log("[Persistence] Link updated:", { id, link });
    // In a real app: await api.updateLink(id, link);
  },
  linkDeleted: ({ id }) => {
    console.log("[Persistence] Link deleted:", id);
    // In a real app: await api.deleteLink(id);
  },
}));
