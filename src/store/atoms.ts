import { atom } from "jotai";
import type { ITask, ILink } from "@svar-ui/gantt-store";

// Primitive atoms for core Gantt data
export const tasksAtom = atom<ITask[]>([
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
]);

export const linksAtom = atom<ILink[]>([
  { id: 1, source: 2, target: 3, type: "e2s" },
]);

export const scalesAtom = atom([
  { unit: "month", step: 1, format: "%M %Y" },
  { unit: "week", step: 1, format: "Week %w" },
]);

// Cross-component UI state
export const selectedTaskIdAtom = atom<number | null>(null);
