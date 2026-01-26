import { proxy } from "valtio";
import type { ITask, ILink, TID } from "@svar-ui/gantt-store";

interface GanttState {
  tasks: ITask[];
  links: ILink[];
  scales: { unit: string; step: number; format: string }[];
  selectedTaskId: number | null;
}

export const ganttStore = proxy<GanttState>({
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
});

// Actions - simple functions that mutate the proxy directly
export function selectTask(id: number | null) {
  ganttStore.selectedTaskId = id;
}

export function addTask(task: Partial<ITask>) {
  ganttStore.tasks.push(task as ITask);
}

export function updateTask(id: TID, updates: Partial<ITask>) {
  const index = ganttStore.tasks.findIndex((t) => t.id === id);
  if (index !== -1) {
    ganttStore.tasks[index] = { ...ganttStore.tasks[index], ...updates };
  }
}

export function deleteTask(id: TID) {
  const index = ganttStore.tasks.findIndex((t) => t.id === id);
  if (index !== -1) {
    ganttStore.tasks.splice(index, 1);
  }
}

export function addLink(link: Partial<ILink>) {
  ganttStore.links.push(link as ILink);
}

export function updateLink(id: TID, updates: Partial<ILink>) {
  const index = ganttStore.links.findIndex((l) => l.id === id);
  if (index !== -1) {
    ganttStore.links[index] = { ...ganttStore.links[index], ...updates };
  }
}

export function deleteLink(id: TID) {
  const index = ganttStore.links.findIndex((l) => l.id === id);
  if (index !== -1) {
    ganttStore.links.splice(index, 1);
  }
}
