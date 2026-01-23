# Using SVAR Gantt with React and MobX

This tutorial walks you through integrating the SVAR Gantt chart component into a React application using Vite and MobX for state management. We'll build it step by step, encountering and solving common issues along the way.

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

## Adding MobX for State Management

Before adding data to our Gantt, let's set up MobX to manage it properly. This approach lets us load data from an API, persist changes, and share state across components.

### Why MobX?

MobX provides a simple, scalable state management solution based on reactive programming principles:

- **Observable state** — Mark your data as observable and MobX automatically tracks dependencies
- **Automatic reactions** — Components re-render only when the specific data they use changes
- **Direct mutations** — Unlike Redux, you modify state directly — no action creators or reducers needed
- **Less boilerplate** — A MobX store is just a class with properties and methods

### The Stateful Island Pattern

Complex UI widgets — rich text editors, data grids, map components, Gantt charts — typically maintain their own internal state. This isn't a limitation; it's by design:

- **Performance** — They need fine-grained control over rendering, often with virtualization. External state management would add latency.
- **Complexity** — Internal state includes transient UI concerns (drag positions, scroll offsets, intermediate edit states) that don't belong in application state.
- **Encapsulation** — The component is a self-contained unit with its own optimized update cycles.

The SVAR Gantt follows this pattern. When you edit a task, drag a bar, or create a link, the component updates immediately without waiting for external state to propagate back. This makes the UI feel responsive.

So where does MobX fit in? Instead of trying to mirror the Gantt's internal state, use MobX for:

- **Initial data loading** — Provide data to the Gantt on mount
- **Persistence** — Intercept data changes and sync to your backend
- **Cross-component communication** — Share relevant state (like the selected task) with other parts of your app

The Gantt remains the source of truth during the session. MobX acts as a messenger, not a mirror.

### Setting Up the Store

Install the required packages:

```bash
npm install mobx mobx-react-lite
```

Create the store with initial data. We'll store tasks and links that get loaded into the Gantt:

`src/store/ganttStore.ts`:

```tsx
import { makeAutoObservable } from "mobx";
import type { ITask, ILink, TID } from "@svar-ui/gantt-store";

class GanttStore {
  tasks: ITask[] = [
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
}

export const ganttStore = new GanttStore();
export type { GanttStore };
```

A few things to note here:

- **`makeAutoObservable(this)`** — This MobX function automatically makes all properties observable and all methods actions. No decorators or manual configuration needed.
- **Class-based store** — Unlike Redux slices, a MobX store is just a plain class. Properties are your state, methods are your actions.
- **Direct property access** — Components will read `store.tasks` directly, not through selectors.

`src/store/index.ts`:

```tsx
import { createContext, useContext } from "react";
import { ganttStore, type GanttStore } from "./ganttStore";

const GanttStoreContext = createContext<GanttStore | null>(null);

export const GanttStoreProvider = GanttStoreContext.Provider;

export function useGanttStore(): GanttStore {
  const store = useContext(GanttStoreContext);
  if (!store) {
    throw new Error("useGanttStore must be used within a GanttStoreProvider");
  }
  return store;
}

export { ganttStore };
export type { GanttStore };
```

We use React Context to provide the store to components. The `useGanttStore` hook gives type-safe access to the store instance.

### Connecting the Store

Wrap your app with the store provider in `src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GanttStoreProvider, ganttStore } from "./store";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GanttStoreProvider value={ganttStore}>
      <App />
    </GanttStoreProvider>
  </StrictMode>
);
```

### Loading Data into the Gantt

Now update `GanttChart.tsx` to read data from the MobX store:

```tsx
import { observer } from "mobx-react-lite";
import { Gantt, Willow } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { useGanttStore } from "../store";

function GanttChart() {
  const store = useGanttStore();

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Willow>
        <Gantt tasks={store.tasks} links={store.links} scales={store.scales} />
      </Willow>
    </div>
  );
}

export default observer(GanttChart);
```

Key points:

- **`observer` wrapper** — This higher-order component from `mobx-react-lite` makes the component reactive. It automatically re-renders when any observed data changes.
- **Direct property access** — We read `store.tasks`, `store.links`, and `store.scales` directly. MobX tracks these accesses and knows when to update.

Now our Gantt displays data loaded from MobX. In a real application, you'd fetch this data from an API in a method like `store.loadData()`.

## Enabling Edit Operations

So far our Gantt displays tasks, but users can't edit them. Let's add an editor panel that allows modifying task properties.

The Gantt component exposes its API through an `init` callback. We can capture this reference and pass it to an `Editor` component:

```tsx
import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Gantt, Willow, Editor } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { useGanttStore } from "../store";

function GanttChart() {
  const store = useGanttStore();
  const [api, setApi] = useState(null);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Willow>
        <Gantt
          tasks={store.tasks}
          links={store.links}
          scales={store.scales}
          init={setApi}
        />
        {api && <Editor api={api} />}
      </Willow>
    </div>
  );
}

export default observer(GanttChart);
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
import { observer } from "mobx-react-lite";
import { Gantt, Willow, Editor, Toolbar } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { useGanttStore } from "../store";

function GanttChart() {
  const store = useGanttStore();
  const [api, setApi] = useState(null);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Willow>
        <div style={{ borderBottom: "1px solid #e5e5e5" }}>
          <Toolbar api={api} />
        </div>
        <Gantt
          tasks={store.tasks}
          links={store.links}
          scales={store.scales}
          init={setApi}
        />
        {api && <Editor api={api} />}
      </Willow>
    </div>
  );
}

export default observer(GanttChart);
```

The container around the Toolbar renders a border between it and the Gantt. The toolbar appears above the Gantt and provides buttons for:

- Adding new tasks
- Deleting selected tasks
- Indenting/outdenting tasks (changing hierarchy)
- Expanding/collapsing task groups

Clicking these buttons triggers actions through the Gantt's API. Changes are reflected in the UI, but they're not yet connected to MobX for persistence.

## Syncing Changes to MobX

Now that editing works, let's wire the Gantt's events back to MobX. This allows us to persist changes and keep other parts of our app in sync.

First, add action methods to handle data changes in `src/store/ganttStore.ts`:

```tsx
import { makeAutoObservable } from "mobx";
import type { ITask, ILink, TID } from "@svar-ui/gantt-store";

class GanttStore {
  tasks: ITask[] = [
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
```

Notice how simple this is compared to Redux — actions are just methods on the class. No action creators, no reducers, no middleware. Side effects (like API calls) happen directly in the action methods.

Now connect the Gantt's events to call these store methods:

```tsx
import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import type { IApi } from "@svar-ui/react-gantt";
import { Gantt, Willow, Editor, Toolbar } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { useGanttStore } from "../store";

function GanttChart() {
  const store = useGanttStore();
  const [api, setApi] = useState<IApi | undefined>(undefined);

  useEffect(() => {
    if (!api) return;

    api.on("select-task", ({ id }) => {
      store.setSelectedTaskId(id as number);
    });

    api.on("add-task", ({ task }) => {
      store.addTask(task);
    });

    api.on("update-task", ({ id, task, inProgress }) => {
      if (inProgress) return; // Skip intermediate drag states
      store.updateTask(id, task);
    });

    api.on("delete-task", ({ id }) => {
      store.deleteTask(id);
    });

    api.on("add-link", ({ link }) => {
      store.addLink(link);
    });

    api.on("update-link", ({ id, link }) => {
      store.updateLink(id, link);
    });

    api.on("delete-link", ({ id }) => {
      store.deleteLink(id);
    });
  }, [api, store]);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Willow>
        <div style={{ borderBottom: "1px solid #e5e5e5" }}>
          <Toolbar api={api} />
        </div>
        <Gantt
          tasks={store.tasks}
          links={store.links}
          scales={store.scales}
          init={setApi}
        />
        {api && <Editor api={api} />}
      </Willow>
    </div>
  );
}

export default observer(GanttChart);
```

The `inProgress` check is important — during drag operations, the Gantt fires multiple `update-task` events. We only want to persist the final state.

Now every edit, addition, or deletion is logged by our store methods. Unlike Redux, MobX doesn't enforce serializable state, so Date objects work fine — no conversion needed.

## Cross-Component Communication

The selection handler we added (`api.on("select-task", ...)`) stores the selected task ID in our MobX store. This enables other components to react when the user selects a task in the Gantt.

Create a component that displays the current selection:

`src/components/TaskDetails.tsx`:

```tsx
import { observer } from "mobx-react-lite";
import { useGanttStore } from "../store";

function TaskDetails() {
  const store = useGanttStore();

  return (
    <footer className="task-details">
      {store.selectedTaskId ? (
        <span>Selected task ID: {store.selectedTaskId}</span>
      ) : (
        <span>No task selected</span>
      )}
    </footer>
  );
}

export default observer(TaskDetails);
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

This component knows nothing about the Gantt — it just reads from the MobX store. In a real application, this could be a details panel, a comments section, or any UI that needs to respond to the user's current focus in the Gantt.

## Summary and Next Steps

In this tutorial we integrated the SVAR Gantt with MobX using the **Stateful Island** pattern:

- **Initial data** is stored in MobX and passed to the Gantt on mount
- **The Gantt owns runtime state** — edits happen instantly without round-trips through MobX
- **Action methods** handle persistence directly — no middleware layer needed
- **Cross-component state** (like `selectedTaskId`) lives in MobX for other components to consume

This architecture keeps the UI responsive while maintaining a clear data flow. MobX's simplicity — observable classes with direct method calls — makes the code straightforward to understand and extend.

### Next Steps for a Real Application

**Data fetching** — Add an async method to load data from your API:

```tsx
class GanttStore {
  // ...existing code...

  async loadData() {
    const response = await api.getProjectData();
    runInAction(() => {
      this.tasks = response.tasks;
      this.links = response.links;
    });
  }
}
```

Note the use of `runInAction` — MobX requires async state updates to be wrapped in an action.

**Persistence** — Replace the `console.log` calls with actual API requests. Consider debouncing rapid updates and handling optimistic updates with rollback on failure.

**Error handling** — Add error state to your store and display notifications when persistence fails. The Gantt will still show the local changes, but users should know if their edits weren't saved.


