import type { ITask, ILink, TID } from "@svar-ui/gantt-store";
import { serializeTask } from "./helpers";

// Persistence notification functions
// These are called when Gantt events occur, replacing Redux middleware pattern
// In a real app, replace console.log with API calls

export function notifyTaskAdded(task: Partial<ITask>) {
  console.log("[Persistence] Task added:", serializeTask(task));
}

export function notifyTaskUpdated(id: TID, task: Partial<ITask>) {
  console.log("[Persistence] Task updated:", { id, task: serializeTask(task) });
}

export function notifyTaskDeleted(id: TID) {
  console.log("[Persistence] Task deleted:", { id });
}

export function notifyLinkAdded(link: Partial<ILink>) {
  console.log("[Persistence] Link added:", link);
}

export function notifyLinkUpdated(id: TID, link: Partial<ILink>) {
  console.log("[Persistence] Link updated:", { id, link });
}

export function notifyLinkDeleted(id: TID) {
  console.log("[Persistence] Link deleted:", { id });
}
