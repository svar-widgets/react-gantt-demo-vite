import { atom } from "jotai";
import type { ITask, ILink, TID } from "@svar-ui/gantt-store";

// Write-only atoms for persistence side effects
// These atoms trigger side effects (API calls, logging) without modifying state

export const taskAddedAtom = atom(
  null,
  async (_get, _set, { task }: { task: Partial<ITask> }) => {
    console.log("[Persistence] Task added:", task);
    // await api.createTask(task);
  }
);

export const taskUpdatedAtom = atom(
  null,
  async (_get, _set, { id, task }: { id: TID; task: Partial<ITask> }) => {
    console.log("[Persistence] Task updated:", { id, task });
    // await api.updateTask(id, task);
  }
);

export const taskDeletedAtom = atom(
  null,
  async (_get, _set, { id }: { id: TID }) => {
    console.log("[Persistence] Task deleted:", id);
    // await api.deleteTask(id);
  }
);

export const linkAddedAtom = atom(
  null,
  async (_get, _set, { link }: { link: Partial<ILink> }) => {
    console.log("[Persistence] Link added:", link);
    // await api.createLink(link);
  }
);

export const linkUpdatedAtom = atom(
  null,
  async (_get, _set, { id, link }: { id: TID; link: Partial<ILink> }) => {
    console.log("[Persistence] Link updated:", { id, link });
    // await api.updateLink(id, link);
  }
);

export const linkDeletedAtom = atom(
  null,
  async (_get, _set, { id }: { id: TID }) => {
    console.log("[Persistence] Link deleted:", id);
    // await api.deleteLink(id);
  }
);
