# Using SVAR Gantt with React, Vite, and Zustand

This tutorial walks you through integrating the SVAR Gantt chart component into a React application using Vite and Zustand for state management. We'll build it step by step, encountering and solving common issues along the way.

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

## Adding Zustand for State Management

Before adding data to our Gantt, let's set up Zustand to manage it properly. This approach lets us load data from an API, persist changes, and share state across components.

### Why Zustand?

Zustand is a small, fast state management library for React. Compared to Redux, it offers:

- **Minimal boilerplate** — No action types, reducers, or providers
- **Tiny bundle size** — ~1KB vs ~16KB for Redux Toolkit + react-redux
- **Simple API** — Just hooks, no wrappers or HOCs
- **TypeScript-first** — Excellent type inference out of the box

### The Stateful Island Pattern

Complex UI widgets — rich text editors, data grids, map components, Gantt charts — typically maintain their own internal state. This isn't a limitation; it's by design:

- **Performance** — They need fine-grained control over rendering, often with virtualization. External state management would add latency.
- **Complexity** — Internal state includes transient UI concerns (drag positions, scroll offsets, intermediate edit states) that don't belong in application state.
- **Encapsulation** — The component is a self-contained unit with its own optimized update cycles.

The SVAR Gantt follows this pattern. When you edit a task, drag a bar, or create a link, the component updates immediately without waiting for external state to propagate back. This makes the UI feel responsive.

So where does Zustand fit in? Instead of trying to mirror the Gantt's internal state, use Zustand for:

- **Initial data loading** — Provide data to the Gantt on mount
- **Persistence** — Intercept data changes and sync to your backend
- **Cross-component communication** — Share relevant state (like the selected task) with other parts of your app

The Gantt remains the source of truth during the session. Zustand acts as a messenger, not a mirror.

### Setting Up the Store

Install Zustand:

```bash
npm install zustand
```

Create the store with initial data. We'll store tasks and links that get loaded into the Gantt:

`src/store/ganttStore.ts`:

```tsx
import { create } from "zustand";
import type { ITask, ILink, TID } from "@svar-ui/gantt-store";

interface GanttState {
  // Data
  tasks: ITask[];
  links: ILink[];
  scales: { unit: string; step: number; format: string }[];

  // UI State
  selectedTaskId: number | null;

  // Actions - signatures match Gantt event payloads for direct binding
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
```

Notice how simple this is compared to Redux. Everything lives in one place:

- State definition
- Initial values
- Actions (just functions that call `set()` or perform side effects)

No slices, no reducers, no action creators, no `configureStore`.

The action signatures match the Gantt's event payloads (e.g., `{ task }`, `{ id }`, `{ id, link }`). This allows us to bind actions directly to events without wrapper functions: `api.on("add-task", taskAdded)`.

Create an index file for clean exports:

`src/store/index.ts`:

```tsx
export { useGanttStore } from "./ganttStore";
```

### Loading Data into the Gantt

The store is global and accessible from any component via the hook. This simplifies your component tree and makes testing easier.

Now update `GanttChart.tsx` to read data from Zustand:

```tsx
import { Gantt, Willow } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { useGanttStore } from "../store";

export default function GanttChart() {
  const tasks = useGanttStore((state) => state.tasks);
  const links = useGanttStore((state) => state.links);
  const scales = useGanttStore((state) => state.scales);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Willow>
        <Gantt tasks={tasks} links={links} scales={scales} />
      </Willow>
    </div>
  );
}
```

The selector syntax `useGanttStore((state) => state.tasks)` ensures the component only re-renders when `tasks` changes, not when other state updates. This is built-in optimization — no need for `useMemo` or separate selector functions.

Now our Gantt displays data loaded from Zustand. In a real application, you'd fetch this data from an API in an effect or action.

## Enabling Edit Operations

So far our Gantt displays tasks, but users can't edit them. Let's add an editor panel that allows modifying task properties.

The Gantt component exposes its API through an `init` callback. We can capture this reference and pass it to an `Editor` component:

```tsx
import { useState } from "react";
import { Gantt, Willow, Editor } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { useGanttStore } from "../store";

export default function GanttChart() {
  const tasks = useGanttStore((state) => state.tasks);
  const links = useGanttStore((state) => state.links);
  const scales = useGanttStore((state) => state.scales);
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
import { useState } from "react";
import { Gantt, Willow, Editor, Toolbar } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { useGanttStore } from "../store";

export default function GanttChart() {
  const tasks = useGanttStore((state) => state.tasks);
  const links = useGanttStore((state) => state.links);
  const scales = useGanttStore((state) => state.scales);
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

Clicking these buttons triggers actions through the Gantt's API. Changes are reflected in the UI, but they're not yet connected to Zustand for persistence.

## Syncing Changes to Zustand

Now that editing works, let's wire the Gantt's events back to Zustand. This allows us to persist changes and keep other parts of our app in sync.

Update `GanttChart.tsx` to wire Gantt events to Zustand actions:

```tsx
import { useEffect, useState } from "react";
import type { IApi } from "@svar-ui/react-gantt";
import { Gantt, Willow, Editor, Toolbar } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";

import { useGanttStore } from "../store";

export default function GanttChart() {
  // Get state from Zustand store
  const tasks = useGanttStore((state) => state.tasks);
  const links = useGanttStore((state) => state.links);
  const scales = useGanttStore((state) => state.scales);

  // Get actions from the store (using selectors to avoid re-renders)
  const taskSelected = useGanttStore((state) => state.taskSelected);
  const taskAdded = useGanttStore((state) => state.taskAdded);
  const taskUpdated = useGanttStore((state) => state.taskUpdated);
  const taskDeleted = useGanttStore((state) => state.taskDeleted);
  const linkAdded = useGanttStore((state) => state.linkAdded);
  const linkUpdated = useGanttStore((state) => state.linkUpdated);
  const linkDeleted = useGanttStore((state) => state.linkDeleted);

  const [api, setApi] = useState<IApi | undefined>(undefined);

  // Wire Gantt events to Zustand actions
  useEffect(() => {
    if (!api) return;

    api.on("select-task", taskSelected);
    api.on("add-task", taskAdded);
    api.on("update-task", ({ id, task, inProgress }) => {
      if (inProgress) return; // Skip intermediate drag states
      taskUpdated(id, task);
    });
    api.on("delete-task", taskDeleted);
    api.on("add-link", linkAdded);
    api.on("update-link", linkUpdated);
    api.on("delete-link", linkDeleted);
  }, [
    api,
    taskSelected,
    taskAdded,
    taskUpdated,
    taskDeleted,
    linkAdded,
    linkUpdated,
    linkDeleted,
  ]);

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

**Why selectors for actions?** You might be tempted to destructure all actions at once with `const { taskSelected, ... } = useGanttStore()`. However, calling `useGanttStore()` without a selector subscribes your component to the *entire* store. When any state changes (like `selectedTaskId`), the component re-renders — even though you only wanted the action functions. This matters because the re-render can interfere with the Gantt's internal event handling. Using individual selectors avoids this. 

The `inProgress` check is important — during drag operations, the Gantt fires multiple `update-task` events. We only want to persist the final state.

Now every edit, addition, or deletion is logged by our actions — ready for API calls.

## Cross-Component Communication

The selection handler we added (`api.on("select-task", ...)`) stores the selected task ID in Zustand. This enables other components to react when the user selects a task in the Gantt.

Create a component that displays the current selection:

`src/components/TaskDetails.tsx`:

```tsx
import { useGanttStore } from "../store";

export default function TaskDetails() {
  const selectedTaskId = useGanttStore((state) => state.selectedTaskId);

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

This component knows nothing about the Gantt — it just reads from Zustand. In a real application, this could be a details panel, a comments section, or any UI that needs to respond to the user's current focus in the Gantt.

## Summary and Next Steps

In this tutorial we integrated the SVAR Gantt with Zustand using the **Stateful Island** pattern:

- **Initial data** is stored in Zustand and passed to the Gantt on mount
- **The Gantt owns runtime state** — edits happen instantly without round-trips through Zustand
- **Actions** are called for persistence but don't modify Zustand state
- **Cross-component state** (like `selectedTaskId`) lives in Zustand for other components to consume
- **No Provider needed** — simpler component tree than Redux

This architecture keeps the UI responsive while maintaining a clear data flow.


### Next Steps for a Real Application

**Data fetching** — Fetch initial data from your API. You can do this in an effect or create an async action:

```tsx
// In your store
fetchTasks: async () => {
  const response = await api.getProjectData();
  set({ tasks: response.tasks, links: response.links });
}
```

**Persistence** — Replace the `console.log` calls in actions with actual API requests. Consider debouncing rapid updates and handling optimistic updates with rollback on failure.

**Error handling** — Add error state to Zustand and display notifications when persistence fails. The Gantt will still show the local changes, but users should know if their edits weren't saved.

