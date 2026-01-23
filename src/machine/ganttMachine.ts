import { setup, assign } from "xstate";
import type { ITask, ILink, TID } from "@svar-ui/gantt-store";

// Initial data
const initialTasks: ITask[] = [
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

const initialLinks: ILink[] = [{ id: 1, source: 2, target: 3, type: "e2s" }];

const initialScales = [
  { unit: "month", step: 1, format: "%M %Y" },
  { unit: "week", step: 1, format: "Week %w" },
];

// Machine context type
interface GanttContext {
  tasks: ITask[];
  links: ILink[];
  scales: { unit: string; step: number; format: string }[];
  selectedTaskId: TID | null;
}

// Event types - using Gantt's native action names
type GanttEvent =
  | { type: "select-task"; id: TID | null }
  | { type: "add-task"; task: Partial<ITask> }
  | { type: "update-task"; id: TID; task: Partial<ITask>; inProgress?: boolean }
  | { type: "delete-task"; id: TID }
  | { type: "add-link"; link: Partial<ILink> }
  | { type: "update-link"; id: TID; link: Partial<ILink> }
  | { type: "delete-link"; id: TID };

export const ganttMachine = setup({
  types: {
    context: {} as GanttContext,
    events: {} as GanttEvent,
  },
  actions: {
    setSelectedTask: assign({
      selectedTaskId: ({ event }) => {
        if (event.type !== "select-task") return null;
        return event.id;
      },
    }),
    logTaskAdded: ({ event }) => {
      if (event.type !== "add-task") return;
      console.log("[Persistence] Task added:", event.task);
    },
    logTaskUpdated: ({ event }) => {
      if (event.type !== "update-task") return;
      if (event.inProgress) return; // Skip intermediate drag states
      console.log("[Persistence] Task updated:", { id: event.id, task: event.task });
    },
    logTaskDeleted: ({ event }) => {
      if (event.type !== "delete-task") return;
      console.log("[Persistence] Task deleted:", { id: event.id });
    },
    logLinkAdded: ({ event }) => {
      if (event.type !== "add-link") return;
      console.log("[Persistence] Link added:", event.link);
    },
    logLinkUpdated: ({ event }) => {
      if (event.type !== "update-link") return;
      console.log("[Persistence] Link updated:", { id: event.id, link: event.link });
    },
    logLinkDeleted: ({ event }) => {
      if (event.type !== "delete-link") return;
      console.log("[Persistence] Link deleted:", { id: event.id });
    },
  },
}).createMachine({
  id: "gantt",
  initial: "ready",
  context: {
    tasks: initialTasks,
    links: initialLinks,
    scales: initialScales,
    selectedTaskId: null,
  },
  states: {
    ready: {
      on: {
        "select-task": {
          actions: "setSelectedTask",
        },
        "add-task": {
          actions: "logTaskAdded",
        },
        "update-task": {
          actions: "logTaskUpdated",
        },
        "delete-task": {
          actions: "logTaskDeleted",
        },
        "add-link": {
          actions: "logLinkAdded",
        },
        "update-link": {
          actions: "logLinkUpdated",
        },
        "delete-link": {
          actions: "logLinkDeleted",
        },
      },
    },
  },
});

export type { GanttContext, GanttEvent };
