import { configureStore } from "@reduxjs/toolkit";
import type { Middleware } from "@reduxjs/toolkit";

import ganttReducer, {
  taskAdded,
  taskUpdated,
  taskDeleted,
  linkAdded,
  linkUpdated,
  linkDeleted,
} from "./ganttSlice";

// Middleware to handle persistence side effects
const persistenceMiddleware: Middleware = () => (next) => (action) => {
  // Process action first
  const result = next(action);

  // Handle persistence actions (would call API in real app)
  if (taskAdded.match(action)) {
    console.log("[Persistence] Task added:", action.payload);
    // await api.createTask(action.payload.task);
  } else if (taskUpdated.match(action)) {
    console.log("[Persistence] Task updated:", action.payload);
    // await api.updateTask(action.payload.id, action.payload.task);
  } else if (taskDeleted.match(action)) {
    console.log("[Persistence] Task deleted:", action.payload);
    // await api.deleteTask(action.payload.id);
  } else if (linkAdded.match(action)) {
    console.log("[Persistence] Link added:", action.payload);
    // await api.createLink(action.payload.link);
  } else if (linkUpdated.match(action)) {
    console.log("[Persistence] Link updated:", action.payload);
    // await api.updateLink(action.payload.id, action.payload.link);
  } else if (linkDeleted.match(action)) {
    console.log("[Persistence] Link deleted:", action.payload);
    // await api.deleteLink(action.payload.id);
  }

  return result;
};

export const store = configureStore({
  reducer: {
    gantt: ganttReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredPaths: ['gantt.tasks'],
      },
    }).concat(persistenceMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
