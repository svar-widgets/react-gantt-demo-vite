# Using SVAR Gantt with React and Vite

This tutorial walks you through integrating the SVAR Gantt chart component into a React application using Vite. We'll build it step by step, encountering and solving common issues along the way.

## Creating the Project

Let's start by creating a new Vite application with React and TypeScript:

```bash
npm create vite@latest my-gantt-app -- --template react-ts
cd my-gantt-app
```

and add the SVAR Gantt package:

```bash
npm install @svar-ui/react-gantt
```

## First Attempt: Adding the Gantt Component

With the package installed, let's create a component to display the Gantt chart. Create `src/components/GanttChart.tsx`:

```tsx
import { Gantt } from "@svar-ui/react-gantt";

export default function GanttChart() {
  return (
    <div style={{ height: "600px", width: "100%" }}>
      <Gantt tasks={[]} links={[]} />
    </div>
  );
}
```

Let's also update `src/App.tsx` to display our component:

```tsx
import GanttChart from "./components/GanttChart";

export default function App() {
  return <GanttChart />;
}
```

Time to see what we've got — run `npm run dev` and... the component renders, but something's off. Elements are misaligned, there's no proper styling. What did we miss?

## Adding Styles

Right, we forgot to import the component's CSS. Let's update our imports in `GanttChart.tsx`:

```tsx
import { Gantt } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
```

Note that the gantt package provides two css files `all.css` and `style.css`. Using `all.css` is a safe bet, it includes all styles that are necessary for the gantt. `style.css` doesn't include styles for other svar widgets that are used inside of the gantt (such like a Grid, Editors, etc.) it can be used to optimize the bundle size.

Let's refresh the page. Better! The layout looks correct now, but everything seems suspiciously plain — no colors, no visual hierarchy. The component works but feels like it's missing something.

## Adding the Theme

SVAR components use a theme provider for visual styling. We need to wrap our Gantt with the `Willow` theme:

```tsx
import { Gantt, Willow } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";

export default function GanttChart() {
  return (
    <div style={{ height: "600px", width: "100%" }}>
      <Willow>
        <Gantt tasks={[]} links={[]} />
      </Willow>
    </div>
  );
}
```

That's more like it — styled headers and proper visual feedback. But our Gantt is empty. Before we add hardcoded data, let's set up proper state management.

## Fixing the Layout

If you're going for a flexible layout where the Gantt should fill available space (instead of our fixed 600px height), you might run into another issue. Let's try changing the container to use percentage height:

```tsx
<div style={{ height: "100%", width: "100%" }}>
  <Willow>
    <Gantt tasks={[]} links={[]} />
  </Willow>
</div>
```

Hmm, now the Gantt might collapse or not fill the space correctly. The issue here is that the theme wrapper needs explicit height. Let's add this to `src/index.css`:

```css
html,
body {
  height: 100%;
  margin: 0;
}

#root {
  height: 100%;
}

.wx-theme {
  height: 100%;
}
```

The `.wx-theme` class is used internally by SVAR's theme providers. Without explicit height, it defaults to content-based sizing, which breaks the percentage-based layout chain.

Now the Gantt properly fills its container.

## Adding Redux for State Management

Before adding data to our Gantt, let's set up Redux to manage it properly. This approach lets us load data from an API, persist changes, and share state across components.

### The Stateful Island Pattern

Complex UI widgets — rich text editors, data grids, map components, Gantt charts — typically maintain their own internal state. This isn't a limitation; it's by design:

- **Performance** — They need fine-grained control over rendering, often with virtualization. External state management would add latency.
- **Complexity** — Internal state includes transient UI concerns (drag positions, scroll offsets, intermediate edit states) that don't belong in application state.
- **Encapsulation** — The component is a self-contained unit with its own optimized update cycles.

The SVAR Gantt follows this pattern. When you edit a task, drag a bar, or create a link, the component updates immediately without waiting for external state to propagate back. This makes the UI feel responsive.

So where does Redux fit in? Instead of trying to mirror the Gantt's internal state, use Redux for:

- **Initial data loading** — Provide data to the Gantt on mount
- **Persistence** — Intercept data changes and sync to your backend
- **Cross-component communication** — Share relevant state (like the selected task) with other parts of your app

The Gantt remains the source of truth during the session. Redux acts as a messenger, not a mirror.

### Setting Up the Store

Install the required packages:

```bash
npm install @reduxjs/toolkit react-redux
```

Create the store with initial data. We'll store tasks and links that get loaded into the Gantt:

`src/store/ganttSlice.ts`:

```tsx
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { ITask, ILink, TID } from "@svar-ui/gantt-store";
import type { RootState } from "./store";

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
      end: new Date(2024, 0, 10),
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
```

`src/store/store.ts`:

```tsx
import { configureStore } from "@reduxjs/toolkit";
import ganttReducer from "./ganttSlice";

export const store = configureStore({
  reducer: { gantt: ganttReducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

`src/store/hooks.ts`:

```tsx
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "./store";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

`src/store/index.ts`:

```tsx
export { store } from "./store";
export type { RootState, AppDispatch } from "./store";
export { useAppDispatch, useAppSelector } from "./hooks";
export {
  taskSelected,
  selectSelectedTaskId,
  selectTasks,
  selectLinks,
  selectScales,
} from "./ganttSlice";
```

### Connecting the Store

Wrap your app with the Redux provider in `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
```

### Loading Data into the Gantt

Now update `GanttChart.tsx` to read data from Redux:

```tsx
import { useMemo } from "react";
import { Gantt, Willow } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { useAppSelector, selectTasks, selectLinks, selectScales } from "../store";

export default function GanttChart() {
  const tasksFromStore = useAppSelector(selectTasks);
  const tasks = useMemo(() => tasksFromStore.map(t => ({ ...t })), [tasksFromStore]);
  const links = useAppSelector(selectLinks);
  const scales = useAppSelector(selectScales);


  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Willow>
        <Gantt tasks={tasks} links={links} scales={scales} />
      </Willow>
    </div>
  );
}
```

Notice the `useMemo` wrapper around tasks. Redux state is frozen (immutable) by default — the objects returned from selectors cannot be modified. However, the Gantt component needs to mutate task objects internally during operations like drag-and-drop. By creating shallow copies with `map(t => ({ ...t }))`, we give the Gantt mutable objects while preserving React's referential equality checks for re-renders.

If your data comes from outside Redux (e.g., directly from an API response), you don't need this copying step.

Now our Gantt displays data loaded from Redux. In a real application, you'd dispatch an async thunk to fetch this data from an API.

## Enabling Edit Operations

So far our Gantt displays tasks, but users can't edit them. Let's add an editor panel that allows modifying task properties.

The Gantt component exposes its API through an `init` callback. We can capture this reference and pass it to an `Editor` component:

```tsx
import { useMemo, useState } from "react";
import { Gantt, Willow, Editor } from "@svar-ui/react-gantt";
import { useAppSelector, selectTasks, selectLinks, selectScales } from "../store";
import "@svar-ui/react-gantt/all.css";

export default function GanttChart() {
  const tasksFromStore = useAppSelector(selectTasks);
  const tasks = useMemo(() => tasksFromStore.map(t => ({ ...t })), [tasksFromStore]);
  const links = useAppSelector(selectLinks);
  const scales = useAppSelector(selectScales);
  const [api, setApi] = useState(null);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Willow>
        <Gantt tasks={tasks} links={links} scales={scales} init={setApi} />
        {api && <Editor api={api} />}
      </Willow>
    </div>
  );
}
```

A few things happening here:

- **`init={setApi}`** — When the Gantt initializes, it passes its API object to our state setter
- **`{api && <Editor ... />}`** — The Editor requires the API to function, so we only render it once the API is available
- **`Editor`** — Renders a side panel that appears when a task is selected, allowing users to modify its properties

Now double-clicking on a task opens an editor panel where users can change the task name, dates, progress, and other properties.

## Adding the Toolbar

To provide quick access to common operations like adding tasks, deleting, and indenting, let's add the `Toolbar` component. It's included in the gantt package, no extra install needed.

The toolbar needs the Gantt's API reference to trigger actions. We pass it the same `api` state:

```tsx
import { useMemo, useState } from "react";
import { Gantt, Willow, Editor, Toolbar } from "@svar-ui/react-gantt";
import { useAppSelector, selectTasks, selectLinks, selectScales } from "../store";
import "@svar-ui/react-gantt/all.css";

export default function GanttChart() {
  const tasksFromStore = useAppSelector(selectTasks);
  const tasks = useMemo(() => tasksFromStore.map(t => ({ ...t })), [tasksFromStore]);
  const links = useAppSelector(selectLinks);
  const scales = useAppSelector(selectScales);
  const [api, setApi] = useState(null);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Willow>
        <div style={{ borderBottom: "1px solid #e5e5e5" }}>
          <Toolbar api={api} />
        </div>
        <Gantt tasks={tasks} links={links} scales={scales} init={setApi} />
        {api && <Editor api={api} />}
      </Willow>
    </div>
  );
}
```

The container around the Toolbar renders a border between it and the Gantt. The toolbar appears above the Gantt and provides buttons for:

- Adding new tasks
- Deleting selected tasks
- Indenting/outdenting tasks (changing hierarchy)
- Expanding/collapsing task groups

Clicking these buttons triggers actions through the Gantt's API. Changes are reflected in the UI, but they're not yet connected to Redux for persistence.

## Syncing Changes to Redux

Now that editing works, let's wire the Gantt's events back to Redux. This allows us to persist changes and keep other parts of our app in sync.

First, add actions and middleware to handle data changes:

`src/store/ganttSlice.ts` (updated):

```tsx
import { createSlice, createAction } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { ITask, ILink, TID } from "@svar-ui/gantt-store";
import type { RootState } from "./store";

// Side-effect actions for persistence (handled by middleware)
export const taskAdded = createAction<{ task: Partial<ITask> }>("gantt/taskAdded");
export const taskUpdated = createAction<{ id: TID; task: Partial<ITask> }>("gantt/taskUpdated");
export const taskDeleted = createAction<{ id: TID }>("gantt/taskDeleted");
export const linkAdded = createAction<{ link: Partial<ILink> }>("gantt/linkAdded");
export const linkUpdated = createAction<{ id: TID; link: Partial<ILink> }>("gantt/linkUpdated");
export const linkDeleted = createAction<{ id: TID }>("gantt/linkDeleted");
```

Notice that `taskUpdated`, `taskAdded`, etc. are created with `createAction` — they don't modify Redux state. They exist purely to be intercepted by middleware for persistence.

Update the store with persistence middleware:

`src/store/store.ts` (updated):

```tsx
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

const persistenceMiddleware: Middleware = () => (next) => (action) => {
  const result = next(action);

  if (taskAdded.match(action)) {
    console.log("[Persistence] Task added:", action.payload);
  } else if (taskUpdated.match(action)) {
    console.log("[Persistence] Task updated:", action.payload);
  } else if (taskDeleted.match(action)) {
    console.log("[Persistence] Task deleted:", action.payload);
  } else if (linkAdded.match(action)) {
    console.log("[Persistence] Link added:", action.payload);
  } else if (linkUpdated.match(action)) {
    console.log("[Persistence] Link updated:", action.payload);
  } else if (linkDeleted.match(action)) {
    console.log("[Persistence] Link deleted:", action.payload);
  }

  return result;
};

export const store = configureStore({
  reducer: { gantt: ganttReducer },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(persistenceMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

Update the exports in `src/store/index.ts`:

```tsx
export { store } from "./store";
export type { RootState, AppDispatch } from "./store";
export { useAppDispatch, useAppSelector } from "./hooks";
export {
  taskSelected,
  taskAdded,
  taskUpdated,
  taskDeleted,
  linkAdded,
  linkUpdated,
  linkDeleted,
  selectSelectedTaskId,
  selectTasks,
  selectLinks,
  selectScales,
} from "./ganttSlice";
```

### Handling Date Serialization

If you try editing a task now, you'll see a warning in the console:

```
A non-serializable value was detected in an action, in the path: `payload.task.start`.
Value: Thu Jan 18 2024 00:00:00 GMT+0100 (Central European Standard Time)
```

This happens because Redux Toolkit enforces serializable state by default. Redux expects all values in state and actions to be plain JSON — objects, arrays, strings, numbers, booleans, and null. Date objects don't qualify because they can't survive a `JSON.stringify()` → `JSON.parse()` round-trip:

```js
const date = new Date(2024, 0, 15);
const json = JSON.stringify(date);        // '"2024-01-15T00:00:00.000Z"'
const parsed = JSON.parse(json);          // "2024-01-15T00:00:00.000Z" — a string, not a Date!
```

This matters for several Redux features:

- **Redux DevTools** — Time-travel debugging serializes state snapshots. Non-serializable values break this.
- **State persistence** — Libraries like `redux-persist` store state in localStorage as JSON.
- **Server-side rendering** — State needs to be serialized to transfer from server to client.

You have two options:

1. **Disable the check** — Add `serializableCheck: false` to middleware options. Quick but you lose the safety net.
2. **Serialize dates at the boundary** — Convert Date objects to ISO strings before dispatching. This is the recommended approach.

Since we're dispatching to a persistence layer anyway (which likely expects strings for API calls), let's convert dates properly. Create a helper function:

`src/store/helpers.ts`:

```tsx
export function serializeTask<T extends { start?: Date; end?: Date }>(task: T): T {
  return {
    ...task,
    data: null, // strip nested data object
    start: task.start instanceof Date ? task.start.toISOString() : task.start,
    end: task.end instanceof Date ? task.end.toISOString() : task.end,
  };
}
```

Export it from `src/store/index.ts`:

```tsx
export { store } from "./store";
export type { RootState, AppDispatch } from "./store";
export { useAppDispatch, useAppSelector } from "./hooks";
export { serializeTask } from "./helpers";
export {
  taskSelected,
  taskAdded,
  taskUpdated,
  taskDeleted,
  linkAdded,
  linkUpdated,
  linkDeleted,
  selectSelectedTaskId,
  selectTasks,
  selectLinks,
  selectScales,
} from "./ganttSlice";
```

This solves the warning for action payloads. But there's one more issue — the initial state in `ganttSlice.ts` also contains Date objects. While we could convert those to strings, it would be pointless: the Gantt component expects Date objects, so we'd just be converting strings back to dates when loading data. Instead, let's tell Redux to skip checking the initial task data.

Update `src/store/store.ts` to ignore the initial state path:

```tsx
export const store = configureStore({
  reducer: { gantt: ganttReducer },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredPaths: ['gantt.tasks'],
      },
    }).concat(persistenceMiddleware),
});
```

Now the serialization check applies only to action payloads, where `serializeTask` ensures dates are properly converted.

Now connect the Gantt's events to dispatch these actions, using the helper to serialize task data:

```tsx
import { useEffect, useMemo, useState } from "react";
import type { IApi } from "@svar-ui/react-gantt";
import { Gantt, Willow, Editor, Toolbar } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import {
  useAppDispatch,
  useAppSelector,
  selectTasks,
  selectLinks,
  selectScales,
  serializeTask,
  taskSelected,
  taskAdded,
  taskUpdated,
  taskDeleted,
  linkAdded,
  linkUpdated,
  linkDeleted,
} from "../store";

export default function GanttChart() {
  const tasksFromStore = useAppSelector(selectTasks);
  const tasks = useMemo(() => tasksFromStore.map(t => ({ ...t })), [tasksFromStore]);
  const links = useAppSelector(selectLinks);
  const scales = useAppSelector(selectScales);
  const [api, setApi] = useState<IApi | undefined>(undefined);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!api) return;

    api.on("select-task", ({ id }) => {
      dispatch(taskSelected(id as number));
    });

    api.on("add-task", ({ task }) => {
      dispatch(taskAdded({ task: serializeTask(task) }));
    });

    api.on("update-task", ({ id, task, inProgress }) => {
      if (inProgress) return; // Skip intermediate drag states
      dispatch(taskUpdated({ id, task: serializeTask(task) }));
    });

    api.on("delete-task", ({ id }) => {
      dispatch(taskDeleted({ id }));
    });

    api.on("add-link", ({ link }) => {
      dispatch(linkAdded({ link }));
    });

    api.on("update-link", ({ id, link }) => {
      dispatch(linkUpdated({ id, link }));
    });

    api.on("delete-link", ({ id }) => {
      dispatch(linkDeleted({ id }));
    });
  }, [api, dispatch]);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Willow>
        <div style={{ borderBottom: "1px solid #e5e5e5" }}>
          <Toolbar api={api} />
        </div>
        <Gantt tasks={tasks} links={links} scales={scales} init={setApi} />
        {api && <Editor api={api} />}
      </Willow>
    </div>
  );
}
```

The `inProgress` check is important — during drag operations, the Gantt fires multiple `update-task` events. We only want to persist the final state.

Now every edit, addition, or deletion is logged by our middleware with properly serialized dates. The console output will show ISO strings like `"2024-01-15T00:00:00.000Z"` instead of Date objects — ready for API calls or localStorage persistence.

## Cross-Component Communication

The selection handler we added (`api.on("select-task", ...)`) stores the selected task ID in Redux. This enables other components to react when the user selects a task in the Gantt.

Create a component that displays the current selection:

`src/components/TaskDetails.tsx`:

```tsx
import { useAppSelector, selectSelectedTaskId } from "../store";

export default function TaskDetails() {
  const selectedTaskId = useAppSelector(selectSelectedTaskId);

  return (
    <footer className="task-details">
      {selectedTaskId ? (
        <span>Selected task ID: {selectedTaskId}</span>
      ) : (
        <span>No task selected</span>
      )}
    </footer>
  );
}
```

Update `src/App.tsx` to include the footer:

```tsx
import GanttChart from "./components/GanttChart";
import TaskDetails from "./components/TaskDetails";

export default function App() {
  return (
    <>
      <GanttChart />
      <TaskDetails />
    </>
  );
}
```

This component knows nothing about the Gantt — it just reads from Redux. In a real application, this could be a details panel, a comments section, or any UI that needs to respond to the user's current focus in the Gantt.

## Summary and Next Steps

In this tutorial we integrated the SVAR Gantt with Redux using the **Stateful Island** pattern:

- **Initial data** is stored in Redux and passed to the Gantt on mount
- **The Gantt owns runtime state** — edits happen instantly without round-trips through Redux
- **Side-effect actions** (`taskAdded`, `taskUpdated`, etc.) are dispatched for persistence but don't modify Redux state
- **Middleware intercepts** these actions to sync with your backend
- **Cross-component state** (like `selectedTaskId`) lives in Redux for other components to consume

This architecture keeps the UI responsive while maintaining a clear data flow.

### Next Steps for a Real Application

**Data fetching** — Replace the hardcoded initial state with an async thunk that loads data from your API:

```tsx
export const fetchGanttData = createAsyncThunk("gantt/fetch", async () => {
  const response = await api.getProjectData();
  return response;
});
```

**Persistence** — Replace the `console.log` calls in the middleware with actual API requests. Consider debouncing rapid updates and handling optimistic updates with rollback on failure.

**Error handling** — Add error state to Redux and display notifications when persistence fails. The Gantt will still show the local changes, but users should know if their edits weren't saved.
