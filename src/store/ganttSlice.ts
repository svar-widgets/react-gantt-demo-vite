import { createSlice, createAction } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { ITask, ILink, TID } from "@svar-ui/gantt-store";
import type { RootState } from "./store";

// Side-effect actions for persistence (no state changes, handled by middleware)
export const taskAdded = createAction<{ task: Partial<ITask> }>("gantt/taskAdded");
export const taskUpdated = createAction<{ id: TID; task: Partial<ITask> }>("gantt/taskUpdated");
export const taskDeleted = createAction<{ id: TID }>("gantt/taskDeleted");
export const linkAdded = createAction<{ link: Partial<ILink> }>("gantt/linkAdded");
export const linkUpdated = createAction<{ id: TID; link: Partial<ILink> }>("gantt/linkUpdated");
export const linkDeleted = createAction<{ id: TID }>("gantt/linkDeleted");

// State only holds cross-component UI state, not the data itself
interface GanttState {
  tasks: ITask[];
  links: ILink[];
  scales: { unit: string; step: number; format: string }[];
  selectedTaskId: number | null;
}

const initialState: GanttState = {
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
};

const ganttSlice = createSlice({
  name: "gantt",
  initialState,
  reducers: {
    taskSelected(state, action: PayloadAction<number | null>) {
      state.selectedTaskId = action.payload;
    },
  },
});

export const selectTasks = (state: RootState) => state.gantt.tasks;
export const selectLinks = (state: RootState) => state.gantt.links;
export const selectScales = (state: RootState) => state.gantt.scales;
export const { taskSelected } = ganttSlice.actions;

export const selectSelectedTaskId = (state: RootState) => state.gantt.selectedTaskId;

export default ganttSlice.reducer;
