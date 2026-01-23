import { makeAutoObservable } from "mobx";
import type { ITask, ILink, TID } from "@svar-ui/gantt-store";

class GanttStore {
  tasks: ITask[] = [
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
  ];

  links: ILink[] = [{ id: 1, source: 2, target: 3, type: "e2s" }];

  scales = [
    { unit: "month", step: 1, format: "%M %Y" },
    { unit: "week", step: 1, format: "Week %w" },
  ];

  selectedTaskId: number | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setSelectedTaskId(id: number | null) {
    this.selectedTaskId = id;
  }

  addTask(task: Partial<ITask>) {
    console.log("[Persistence] Task added:", task);
    // In a real app, you would call your API here
  }

  updateTask(id: TID, task: Partial<ITask>) {
    console.log("[Persistence] Task updated:", { id, task });
    // In a real app, you would call your API here
  }

  deleteTask(id: TID) {
    console.log("[Persistence] Task deleted:", { id });
    // In a real app, you would call your API here
  }

  addLink(link: Partial<ILink>) {
    console.log("[Persistence] Link added:", link);
    // In a real app, you would call your API here
  }

  updateLink(id: TID, link: Partial<ILink>) {
    console.log("[Persistence] Link updated:", { id, link });
    // In a real app, you would call your API here
  }

  deleteLink(id: TID) {
    console.log("[Persistence] Link deleted:", { id });
    // In a real app, you would call your API here
  }
}

export const ganttStore = new GanttStore();
export type { GanttStore };
