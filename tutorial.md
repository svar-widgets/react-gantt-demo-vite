# Using SVAR Gantt with React and Valtio

This tutorial walks you through integrating the SVAR Gantt chart component into a React application using Vite, with Valtio for state management. We'll build it step by step, encountering and solving common issues along the way.

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

## Adding Valtio for State Management

Before adding data to our Gantt, let's set up Valtio to manage it properly. This approach lets us load data from an API, persist changes, and share state across components.

### Why Valtio?

Valtio offers a refreshingly simple approach to state management using JavaScript Proxies. Unlike traditional state managers that require actions, reducers, or immutable updates, Valtio lets you work with state naturally:

```tsx
// Define state
const state = proxy({ count: 0 });

// Update state - just mutate it directly
state.count++;

// Read state reactively in React
const snap = useSnapshot(state);
return <div>{snap.count}</div>;
```

This makes Valtio particularly well-suited for managing complex UI state like a Gantt chart, where you want simplicity without sacrificing reactivity.

### The Stateful Island Pattern

Complex UI widgets — rich text editors, data grids, map components, Gantt charts — typically maintain their own internal state. This isn't a limitation; it's by design:

- **Performance** — They need fine-grained control over rendering, often with virtualization. External state management would add latency.
- **Complexity** — Internal state includes transient UI concerns (drag positions, scroll offsets, intermediate edit states) that don't belong in application state.
- **Encapsulation** — The component is a self-contained unit with its own optimized update cycles.

The SVAR Gantt follows this pattern. When you edit a task, drag a bar, or create a link, the component updates immediately without waiting for external state to propagate back. This makes the UI feel responsive.

So where does Valtio fit in? Instead of trying to mirror the Gantt's internal state, use Valtio for:

- **Initial data loading** — Provide data to the Gantt on mount
- **Persistence** — Intercept data changes and sync to your backend
- **Cross-component communication** — Share relevant state (like the selected task) with other parts of your app

The Gantt remains the source of truth during the session. Valtio acts as a messenger, not a mirror.

### Setting Up the Store

Install Valtio:

```bash
npm install valtio
```

Create the store with initial data. We'll store tasks and links that get loaded into the Gantt:

`src/store/ganttStore.ts`:

```tsx
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
});

// Actions - simple functions that mutate the proxy directly
export function selectTask(id: number | null) {
  ganttStore.selectedTaskId = id;
}
```

Notice how different this is from traditional state management:

- **No reducers** — State is defined once with `proxy()`
- **No actions** — Functions mutate the proxy directly
- **No Provider** — The store is just an export, no wrapping needed

Create a barrel export for convenient imports:

`src/store/index.ts`:

```tsx
export { ganttStore, selectTask } from "./ganttStore";
```

### Loading Data into the Gantt

Now update `GanttChart.tsx` to read data from Valtio:

```tsx
import { useSnapshot } from "valtio";
import { Gantt, Willow } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { ganttStore } from "../store";

export default function GanttChart() {
  const snap = useSnapshot(ganttStore);

  // Convert readonly snapshot arrays to mutable arrays for Gantt component
  const tasks = [...snap.tasks] as typeof ganttStore.tasks;
  const links = [...snap.links] as typeof ganttStore.links;
  const scales = [...snap.scales] as typeof ganttStore.scales;

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Willow>
        <Gantt tasks={tasks} links={links} scales={scales} />
      </Willow>
    </div>
  );
}
```

A few things to note:

- **`useSnapshot(ganttStore)`** — Returns a reactive, readonly snapshot of the store. When `ganttStore.tasks` changes anywhere in your app, this component re-renders.
- **Array spreading** — Valtio's snapshot returns readonly arrays for type safety. Since the Gantt component expects mutable arrays, we spread them into new arrays. This is a shallow copy, which is efficient since we're not modifying the task objects themselves.

Now our Gantt displays data loaded from Valtio. In a real application, you'd fetch this data from an API and update the store.

## Enabling Edit Operations

So far our Gantt displays tasks, but users can't edit them. Let's add an editor panel that allows modifying task properties.

The Gantt component exposes its API through an `init` callback. We can capture this reference and pass it to an `Editor` component:

```tsx
import { useState, useMemo } from "react";
import { useSnapshot } from "valtio";
import { Gantt, Willow, Editor } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { ganttStore } from "../store";

export default function GanttChart() {
  const snap = useSnapshot(ganttStore);
  const [api, setApi] = useState(null);

  // Convert readonly snapshot arrays to mutable arrays for Gantt component
  const tasks = useMemo(() => snap.tasks.map(x => ({ ...x })) as typeof ganttStore.tasks, [snap.tasks]);
  const links = useMemo(() => [...snap.links] as typeof ganttStore.links, [snap.links]);
  const scales = useMemo(() => [...snap.scales] as typeof ganttStore.scales, [snap.scales]);

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
import { useState, useMemo } from "react";
import { useSnapshot } from "valtio";
import { Gantt, Willow, Editor, Toolbar } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { ganttStore } from "../store";

export default function GanttChart() {
  const snap = useSnapshot(ganttStore);
  const [api, setApi] = useState(null);

  // Convert readonly snapshot arrays to mutable arrays for Gantt component
  const tasks = useMemo(() => snap.tasks.map(x => ({ ...x })) as typeof ganttStore.tasks, [snap.tasks]);
  const links = useMemo(() => [...snap.links] as typeof ganttStore.links, [snap.links]);
  const scales = useMemo(() => [...snap.scales] as typeof ganttStore.scales, [snap.scales]);

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

Clicking these buttons triggers actions through the Gantt's API. Changes are reflected in the UI, but they're not yet connected to Valtio for persistence.

## Syncing Changes to Valtio

Now that editing works, let's wire the Gantt's events to notify our persistence layer. This allows us to sync changes with your backend.

First, create a helper for date serialization:

`src/store/helpers.ts`:

```tsx
export function serializeTask<T extends { start?: Date; end?: Date }>(task: T): T {
  return {
    ...task,
    start: task.start instanceof Date ? task.start.toISOString() : task.start,
    end: task.end instanceof Date ? task.end.toISOString() : task.end,
  };
}
```

### Why Serialize Dates?

When persisting task data to an API or localStorage, Date objects need to be converted to strings. The `serializeTask` helper converts Date objects to ISO strings, which are universally compatible with APIs and can be easily parsed back into Date objects.

### Persistence Notifications

Create notification functions that will be called when the Gantt fires events:

`src/store/persistence.ts`:

```tsx
import type { ITask, ILink, TID } from "@svar-ui/gantt-store";
import { serializeTask } from "./helpers";

// Persistence notification functions
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
```

Update the barrel export:

`src/store/index.ts`:

```tsx
export { ganttStore, selectTask } from "./ganttStore";
export { serializeTask } from "./helpers";
export {
  notifyTaskAdded,
  notifyTaskUpdated,
  notifyTaskDeleted,
  notifyLinkAdded,
  notifyLinkUpdated,
  notifyLinkDeleted,
} from "./persistence";
```

### Connecting Gantt Events

Now connect the Gantt's events to these notifications:

```tsx
import { useEffect, useState, useMemo } from "react";
import { useSnapshot } from "valtio";
import type { IApi } from "@svar-ui/react-gantt";
import { Gantt, Willow, Editor, Toolbar } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import {
  ganttStore,
  selectTask,
  notifyTaskAdded,
  notifyTaskUpdated,
  notifyTaskDeleted,
  notifyLinkAdded,
  notifyLinkUpdated,
  notifyLinkDeleted,
} from "../store";

export default function GanttChart() {
  const snap = useSnapshot(ganttStore);
  const [api, setApi] = useState<IApi | undefined>(undefined);

  // Convert readonly snapshot arrays to mutable arrays for Gantt component
  const tasks = useMemo(() => snap.tasks.map(x => ({ ...x })) as typeof ganttStore.tasks, [snap.tasks]);
  const links = useMemo(() => [...snap.links] as typeof ganttStore.links, [snap.links]);
  const scales = useMemo(() => [...snap.scales] as typeof ganttStore.scales, [snap.scales]);


  useEffect(() => {
    if (!api) return;

    api.on("select-task", ({ id }) => {
      selectTask(id as number);
    });

    api.on("add-task", ({ task }) => {
      notifyTaskAdded(task);
    });

    api.on("update-task", ({ id, task, inProgress }) => {
      if (inProgress) return; // Skip intermediate drag states
      notifyTaskUpdated(id, task);
    });

    api.on("delete-task", ({ id }) => {
      notifyTaskDeleted(id);
    });

    api.on("add-link", ({ link }) => {
      notifyLinkAdded(link);
    });

    api.on("update-link", ({ id, link }) => {
      notifyLinkUpdated(id, link);
    });

    api.on("delete-link", ({ id }) => {
      notifyLinkDeleted(id);
    });
  }, [api]);

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

Now every edit, addition, or deletion is logged with properly serialized dates. The console output will show ISO strings like `"2024-01-15T00:00:00.000Z"` instead of Date objects — ready for API calls or localStorage persistence.

## Cross-Component Communication

The selection handler we added (`api.on("select-task", ...)`) stores the selected task ID in Valtio. This enables other components to react when the user selects a task in the Gantt.

Create a component that displays the current selection:

`src/components/TaskDetails.tsx`:

```tsx
import { useSnapshot } from "valtio";
import { ganttStore } from "../store";

export default function TaskDetails() {
  const { selectedTaskId } = useSnapshot(ganttStore);

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

This component knows nothing about the Gantt — it just reads from Valtio. Notice how simple the integration is:

- **No Provider wrapper** — Unlike Redux or Context, Valtio doesn't need any setup in your component tree
- **Direct store access** — Just import the store and use `useSnapshot()`
- **Automatic reactivity** — The component re-renders when `selectedTaskId` changes

In a real application, this could be a details panel, a comments section, or any UI that needs to respond to the user's current focus in the Gantt.

## Summary and Next Steps

In this tutorial we integrated the SVAR Gantt with Valtio using the **Stateful Island** pattern:

- **Initial data** is stored in Valtio and passed to the Gantt on mount
- **The Gantt owns runtime state** — edits happen instantly without round-trips through Valtio
- **Notification functions** are called for persistence but don't modify Valtio state
- **Cross-component state** (like `selectedTaskId`) lives in Valtio for other components to consume

This architecture keeps the UI responsive while maintaining a clear data flow.

### Next Steps for a Real Application

**Data fetching** — Replace the hardcoded initial state by fetching data and updating the store:

```tsx
async function loadGanttData() {
  const response = await api.getProjectData();
  ganttStore.tasks = response.tasks;
  ganttStore.links = response.links;
}
```

**Persistence** — Replace the `console.log` calls in the notification functions with actual API requests. Consider debouncing rapid updates and handling optimistic updates with rollback on failure.

**Error handling** — Add error state to the store and display notifications when persistence fails. The Gantt will still show the local changes, but users should know if their edits weren't saved.

