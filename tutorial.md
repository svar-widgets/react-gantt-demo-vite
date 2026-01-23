# Using SVAR Gantt with React and Jotai

This tutorial walks you through integrating the SVAR Gantt chart component into a React application using Vite and Jotai for state management. We'll build it step by step, encountering and solving common issues along the way.

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

## Adding Jotai for State Management

Before adding data to our Gantt, let's set up Jotai to manage it properly. This approach lets us load data from an API, persist changes, and share state across components.

### The Stateful Island Pattern

Complex UI widgets — rich text editors, data grids, map components, Gantt charts — typically maintain their own internal state. This isn't a limitation; it's by design:

- **Performance** — They need fine-grained control over rendering, often with virtualization. External state management would add latency.
- **Complexity** — Internal state includes transient UI concerns (drag positions, scroll offsets, intermediate edit states) that don't belong in application state.
- **Encapsulation** — The component is a self-contained unit with its own optimized update cycles.

The SVAR Gantt follows this pattern. When you edit a task, drag a bar, or create a link, the component updates immediately without waiting for external state to propagate back. This makes the UI feel responsive.

So where does Jotai fit in? Instead of trying to mirror the Gantt's internal state, use Jotai for:

- **Initial data loading** — Provide data to the Gantt on mount
- **Persistence** — Intercept data changes and sync to your backend
- **Cross-component communication** — Share relevant state (like the selected task) with other parts of your app

The Gantt remains the source of truth during the session. Jotai acts as a messenger, not a mirror.

### Why Jotai?

Jotai is a primitive and flexible state management library that offers several advantages for this use case:

- **Minimal boilerplate** — No actions, reducers, or store configuration
- **Atomic updates** — Components only re-render when their specific atoms change
- **No Provider required** — Works out of the box with a default store
- **Native Date support** — Unlike some state managers, Jotai can store Date objects directly without serialization
- **Async-friendly** — Atom write functions support async/await natively

### Setting Up the Atoms

Install Jotai:

```bash
npm install jotai
```

Create atoms to store our initial data. Jotai uses "atoms" as the fundamental unit of state:

`src/store/atoms.ts`:

```tsx
import { atom } from "jotai";
import type { ITask, ILink } from "@svar-ui/gantt-store";

// Primitive atoms for core Gantt data
export const tasksAtom = atom<ITask[]>([
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
]);

export const linksAtom = atom<ILink[]>([
  { id: 1, source: 2, target: 3, type: "e2s" },
]);

export const scalesAtom = atom([
  { unit: "month", step: 1, format: "%M %Y" },
  { unit: "week", step: 1, format: "Week %w" },
]);

// Cross-component UI state
export const selectedTaskIdAtom = atom<number | null>(null);
```

Notice we're storing `Date` objects directly. Unlike some state managers that enforce serializable state, Jotai can hold any JavaScript value — Date objects, Maps, Sets, or class instances work without any transformation.

Create the barrel export:

`src/store/index.ts`:

```tsx
export { tasksAtom, linksAtom, scalesAtom, selectedTaskIdAtom } from "./atoms";
```

### No Provider Needed

Unlike many state management solutions, Jotai doesn't require wrapping your app in a Provider. All atoms share a default store at the module level. Your `src/main.tsx` stays simple:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

You only need a `<Provider>` if you want:
- Multiple isolated stores (e.g., for testing)
- Server-side rendering with per-request state
- Component-scoped state trees

### Loading Data into the Gantt

Now update `GanttChart.tsx` to read data from Jotai:

```tsx
import { useAtomValue } from "jotai";
import { Gantt, Willow } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { tasksAtom, linksAtom, scalesAtom } from "../store";

export default function GanttChart() {
  const tasks = useAtomValue(tasksAtom);
  const links = useAtomValue(linksAtom);
  const scales = useAtomValue(scalesAtom);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Willow>
        <Gantt tasks={tasks} links={links} scales={scales} />
      </Willow>
    </div>
  );
}
```

Jotai provides several hooks for different use cases:

| Hook | Purpose | Use Case |
|------|---------|----------|
| `useAtomValue(atom)` | Read-only | Display data, no updates needed |
| `useSetAtom(atom)` | Write-only | Actions, callbacks, event handlers |
| `useAtom(atom)` | Read + Write | Forms, interactive state |

Here we use `useAtomValue` since we only need to read the data. In a real application, you'd populate these atoms by fetching data from an API.

## Enabling Edit Operations

So far our Gantt displays tasks, but users can't edit them. Let's add an editor panel that allows modifying task properties.

The Gantt component exposes its API through an `init` callback. We can capture this reference and pass it to an `Editor` component:

```tsx
import { useState } from "react";
import { useAtomValue } from "jotai";
import { Gantt, Willow, Editor } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { tasksAtom, linksAtom, scalesAtom } from "../store";

export default function GanttChart() {
  const tasks = useAtomValue(tasksAtom);
  const links = useAtomValue(linksAtom);
  const scales = useAtomValue(scalesAtom);
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
import { useAtomValue } from "jotai";
import { Gantt, Willow, Editor, Toolbar } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { tasksAtom, linksAtom, scalesAtom } from "../store";

export default function GanttChart() {
  const tasks = useAtomValue(tasksAtom);
  const links = useAtomValue(linksAtom);
  const scales = useAtomValue(scalesAtom);
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

Clicking these buttons triggers actions through the Gantt's API. Changes are reflected in the UI, but they're not yet connected to Jotai for persistence.

## Syncing Changes to Jotai

Now that editing works, let's wire the Gantt's events back to Jotai. This allows us to persist changes and keep other parts of our app in sync.

### Write-Only Atoms for Side Effects

Jotai handles side effects through "write-only atoms" — atoms that perform actions when written to but don't store state themselves. This pattern is similar to dispatching actions in other state managers:

`src/store/actions.ts`:

```tsx
import { atom } from "jotai";
import type { ITask, ILink, TID } from "@svar-ui/gantt-store";

// Write-only atoms for persistence side effects
export const taskAddedAtom = atom(
  null, // read returns null (write-only)
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
```

The pattern `atom(null, setter)` creates an atom that:
- Returns `null` when read (it's not meant to be read)
- Executes the setter function when written to via `useSetAtom`

This is useful for triggering side effects without modifying application state. The setter function receives:
- `get` — Read other atoms
- `set` — Write to other atoms
- The payload passed when calling the setter

Update the exports in `src/store/index.ts`:

```tsx
// Atoms (state)
export { tasksAtom, linksAtom, scalesAtom, selectedTaskIdAtom } from "./atoms";

// Actions (persistence side effects)
export {
  taskAddedAtom,
  taskUpdatedAtom,
  taskDeletedAtom,
  linkAddedAtom,
  linkUpdatedAtom,
  linkDeletedAtom,
} from "./actions";
```

### Connecting Events to Atoms

Now connect the Gantt's events to dispatch these actions:

```tsx
import { useEffect, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import type { IApi } from "@svar-ui/react-gantt";
import { Gantt, Willow, Editor, Toolbar } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import {
  tasksAtom,
  linksAtom,
  scalesAtom,
  selectedTaskIdAtom,
  taskAddedAtom,
  taskUpdatedAtom,
  taskDeletedAtom,
  linkAddedAtom,
  linkUpdatedAtom,
  linkDeletedAtom,
} from "../store";

export default function GanttChart() {
  // Read atoms
  const tasks = useAtomValue(tasksAtom);
  const links = useAtomValue(linksAtom);
  const scales = useAtomValue(scalesAtom);

  // Write atoms (actions)
  const setSelectedTaskId = useSetAtom(selectedTaskIdAtom);
  const taskAdded = useSetAtom(taskAddedAtom);
  const taskUpdated = useSetAtom(taskUpdatedAtom);
  const taskDeleted = useSetAtom(taskDeletedAtom);
  const linkAdded = useSetAtom(linkAddedAtom);
  const linkUpdated = useSetAtom(linkUpdatedAtom);
  const linkDeleted = useSetAtom(linkDeletedAtom);

  const [api, setApi] = useState<IApi | undefined>(undefined);

  useEffect(() => {
    if (!api) return;

    api.on("select-task", ({ id }) => {
      setSelectedTaskId(id as number);
    });

    api.on("add-task", ({ task }) => {
      taskAdded({ task });
    });

    api.on("update-task", ({ id, task, inProgress }) => {
      if (inProgress) return; // Skip intermediate drag states
      taskUpdated({ id, task });
    });

    api.on("delete-task", ({ id }) => {
      taskDeleted({ id });
    });

    api.on("add-link", ({ link }) => {
      linkAdded({ link });
    });

    api.on("update-link", ({ id, link }) => {
      linkUpdated({ id, link });
    });

    api.on("delete-link", ({ id }) => {
      linkDeleted({ id });
    });
  }, [api, setSelectedTaskId, taskAdded, taskUpdated, taskDeleted,
      linkAdded, linkUpdated, linkDeleted]);

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

Now every edit, addition, or deletion is logged by our action atoms. The console output will show the task data with Date objects intact — ready for API calls or any persistence layer.

## Cross-Component Communication

The selection handler we added (`api.on("select-task", ...)`) stores the selected task ID in Jotai. This enables other components to react when the user selects a task in the Gantt.

Create a component that displays the current selection:

`src/components/TaskDetails.tsx`:

```tsx
import { useAtomValue } from "jotai";
import { selectedTaskIdAtom } from "../store";

export default function TaskDetails() {
  const selectedTaskId = useAtomValue(selectedTaskIdAtom);

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

This component knows nothing about the Gantt — it just reads from Jotai. In a real application, this could be a details panel, a comments section, or any UI that needs to respond to the user's current focus in the Gantt.

## Summary and Next Steps

In this tutorial we integrated the SVAR Gantt with Jotai using the **Stateful Island** pattern:

- **Initial data** is stored in Jotai atoms and passed to the Gantt on mount
- **The Gantt owns runtime state** — edits happen instantly without round-trips through Jotai
- **Write-only atoms** handle persistence side effects without modifying application state
- **Cross-component state** (like `selectedTaskId`) lives in Jotai for other components to consume
- **No Provider required** — Jotai's default store simplifies setup

This architecture keeps the UI responsive while maintaining a clear data flow.

### Next Steps for a Real Application

**Data fetching** — Use Jotai's async atoms or `atomWithDefault` to load data from your API:

```tsx
import { atomWithDefault } from "jotai/utils";

export const tasksAtom = atomWithDefault<ITask[]>(async () => {
  const response = await api.getProjectTasks();
  return response.data;
});
```

**Persistence** — Replace the `console.log` calls in the action atoms with actual API requests. The async setter pattern supports this directly:

```tsx
export const taskUpdatedAtom = atom(
  null,
  async (get, set, { id, task }: { id: TID; task: Partial<ITask> }) => {
    try {
      await api.updateTask(id, task);
    } catch (error) {
      console.error("Failed to update task:", error);
      // Handle error - maybe set an error atom
    }
  }
);
```

**Error handling** — Add error atoms and display notifications when persistence fails. The Gantt will still show the local changes, but users should know if their edits weren't saved.

**Derived state** — Use Jotai's derived atoms for computed values:

```tsx
export const incompleteTaskCountAtom = atom((get) => {
  const tasks = get(tasksAtom);
  return tasks.filter(t => t.progress < 100).length;
});
```
