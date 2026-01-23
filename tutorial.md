# Using SVAR Gantt with React and XState

This tutorial walks you through integrating the SVAR Gantt chart component into a React application using XState for state management. We'll build it step by step, encountering and solving common issues along the way.

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

## Adding XState for State Management

Before adding data to our Gantt, let's set up XState to manage it properly. This approach lets us load data from an API, persist changes, and share state across components.

### The Stateful Island Pattern

Complex UI widgets — rich text editors, data grids, map components, Gantt charts — typically maintain their own internal state. This isn't a limitation; it's by design:

- **Performance** — They need fine-grained control over rendering, often with virtualization. External state management would add latency.
- **Complexity** — Internal state includes transient UI concerns (drag positions, scroll offsets, intermediate edit states) that don't belong in application state.
- **Encapsulation** — The component is a self-contained unit with its own optimized update cycles.

The SVAR Gantt follows this pattern. When you edit a task, drag a bar, or create a link, the component updates immediately without waiting for external state to propagate back. This makes the UI feel responsive.

So where does XState fit in? Instead of trying to mirror the Gantt's internal state, use XState for:

- **Initial data loading** — Provide data to the Gantt on mount
- **Persistence** — Intercept data changes and sync to your backend
- **Cross-component communication** — Share relevant state (like the selected task) with other parts of your app

The Gantt remains the source of truth during the session. XState acts as a messenger, not a mirror.

### Understanding XState

XState is a state management library built around finite state machines and statecharts. Unlike traditional state managers that focus on data changes, XState models your application as a series of states and transitions between them.

Key concepts we'll use:

- **Machine** — A definition of states, events, and transitions
- **Context** — The extended state (data) that the machine carries
- **Events** — Messages that trigger transitions or actions
- **Actions** — Side effects that run in response to events
- **Actor** — A running instance of a machine

For our Gantt integration, we'll create a simple machine that holds the initial data in its context and responds to events when the user interacts with the chart.

### Setting Up the Machine

Install the required packages:

```bash
npm install xstate @xstate/react
```

Create the state machine that will hold our Gantt data. We'll store tasks, links, scales, and track the selected task for cross-component communication.

`src/machine/ganttMachine.ts`:

```tsx
import { setup, assign } from "xstate";
import type { ITask, ILink, TID } from "@svar-ui/gantt-store";

// Initial data
const initialTasks: ITask[] = [
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

// Event types
type GanttEvent =
  | { type: "SELECT_TASK"; id: TID | null }
  | { type: "TASK_ADDED"; task: Partial<ITask> }
  | { type: "TASK_UPDATED"; id: TID; task: Partial<ITask> }
  | { type: "TASK_DELETED"; id: TID }
  | { type: "LINK_ADDED"; link: Partial<ILink> }
  | { type: "LINK_UPDATED"; id: TID; link: Partial<ILink> }
  | { type: "LINK_DELETED"; id: TID };

export const ganttMachine = setup({
  types: {
    context: {} as GanttContext,
    events: {} as GanttEvent,
  },
  actions: {
    setSelectedTask: assign({
      selectedTaskId: ({ event }) => {
        if (event.type !== "SELECT_TASK") return null;
        return event.id;
      },
    }),
    logTaskAdded: ({ event }) => {
      if (event.type !== "TASK_ADDED") return;
      console.log("[Persistence] Task added:", event.task);
    },
    logTaskUpdated: ({ event }) => {
      if (event.type !== "TASK_UPDATED") return;
      console.log("[Persistence] Task updated:", { id: event.id, task: event.task });
    },
    logTaskDeleted: ({ event }) => {
      if (event.type !== "TASK_DELETED") return;
      console.log("[Persistence] Task deleted:", { id: event.id });
    },
    logLinkAdded: ({ event }) => {
      if (event.type !== "LINK_ADDED") return;
      console.log("[Persistence] Link added:", event.link);
    },
    logLinkUpdated: ({ event }) => {
      if (event.type !== "LINK_UPDATED") return;
      console.log("[Persistence] Link updated:", { id: event.id, link: event.link });
    },
    logLinkDeleted: ({ event }) => {
      if (event.type !== "LINK_DELETED") return;
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
        SELECT_TASK: {
          actions: "setSelectedTask",
        },
        TASK_ADDED: {
          actions: "logTaskAdded",
        },
        TASK_UPDATED: {
          actions: "logTaskUpdated",
        },
        TASK_DELETED: {
          actions: "logTaskDeleted",
        },
        LINK_ADDED: {
          actions: "logLinkAdded",
        },
        LINK_UPDATED: {
          actions: "logLinkUpdated",
        },
        LINK_DELETED: {
          actions: "logLinkDeleted",
        },
      },
    },
  },
});

export type { GanttContext, GanttEvent };
```

Let's break down what this machine does:

- **Context** holds the initial tasks, links, scales, and tracks the selected task ID
- **Events** represent all possible interactions: task selection, and CRUD operations for tasks and links
- **Actions** are side effects that run when events occur:
  - `setSelectedTask` updates the context when a task is selected (this is the only state change we need)
  - `logTaskAdded`, `logTaskUpdated`, etc. are placeholder persistence actions that log to console

Notice that most events don't modify the machine's context — they just trigger logging actions. This is intentional: the Gantt component owns the actual data, and we're just notifying our state machine about changes for persistence purposes.

### Creating the React Context

XState provides `createActorContext` to easily share a machine instance across components. Create a context file:

`src/machine/GanttMachineContext.tsx`:

```tsx
import { createActorContext } from "@xstate/react";
import { ganttMachine } from "./ganttMachine";

export const GanttMachineContext = createActorContext(ganttMachine);
```

This creates a React context with built-in hooks for interacting with the machine.

Create a barrel export file for cleaner imports:

`src/machine/index.ts`:

```tsx
export { ganttMachine } from "./ganttMachine";
export type { GanttContext, GanttEvent } from "./ganttMachine";
export { GanttMachineContext } from "./GanttMachineContext";
```

### Connecting the Context Provider

Wrap your app with the machine context provider in `src/App.tsx`:

```tsx
import { GanttMachineContext } from "./machine";
import GanttChart from "./components/GanttChart";

export default function App() {
  return (
    <GanttMachineContext.Provider>
      <GanttChart />
    </GanttMachineContext.Provider>
  );
}
```

Unlike some state managers, XState doesn't require a separate store setup — the `createActorContext` automatically creates and manages the actor instance when the provider mounts.

### Loading Data into the Gantt

Now update `GanttChart.tsx` to read data from the machine's context:

```tsx
import { Gantt, Willow } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { GanttMachineContext } from "../machine";

export default function GanttChart() {
  const { tasks, links, scales } = GanttMachineContext.useSelector(
    (state) => state.context
  );

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Willow>
        <Gantt tasks={tasks} links={links} scales={scales} />
      </Willow>
    </div>
  );
}
```

The `useSelector` hook subscribes to the machine's state and extracts the context. When the context changes, the component re-renders with the new data.

Now our Gantt displays data loaded from the XState machine. In a real application, you could use XState's invoke feature to fetch data from an API on machine startup.

## Enabling Edit Operations

So far our Gantt displays tasks, but users can't edit them. Let's add an editor panel that allows modifying task properties.

The Gantt component exposes its API through an `init` callback. We can capture this reference and pass it to an `Editor` component:

```tsx
import { useState } from "react";
import { Gantt, Willow, Editor } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { GanttMachineContext } from "../machine";

export default function GanttChart() {
  const { tasks, links, scales } = GanttMachineContext.useSelector(
    (state) => state.context
  );
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
import { GanttMachineContext } from "../machine";

export default function GanttChart() {
  const { tasks, links, scales } = GanttMachineContext.useSelector(
    (state) => state.context
  );
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

Clicking these buttons triggers actions through the Gantt's API. Changes are reflected in the UI, but they're not yet connected to XState for persistence.

## Syncing Changes to XState

Now that editing works, let's wire the Gantt's events back to XState. This allows us to persist changes and keep other parts of our app in sync.

Update `GanttChart.tsx` to send events to the machine when the Gantt notifies us of changes:

```tsx
import { useEffect, useState } from "react";
import type { IApi } from "@svar-ui/react-gantt";
import { Gantt, Willow, Editor, Toolbar } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { GanttMachineContext } from "../machine";

export default function GanttChart() {
  const actorRef = GanttMachineContext.useActorRef();
  const { tasks, links, scales } = GanttMachineContext.useSelector(
    (state) => state.context
  );
  const [api, setApi] = useState<IApi | undefined>(undefined);

  useEffect(() => {
    if (!api) return;

    api.on("select-task", ({ id }) => {
      actorRef.send({ type: "SELECT_TASK", id: id as number | null });
    });

    api.on("add-task", ({ task }) => {
      actorRef.send({ type: "TASK_ADDED", task });
    });

    api.on("update-task", ({ id, task, inProgress }) => {
      if (inProgress) return; // Skip intermediate drag states
      actorRef.send({ type: "TASK_UPDATED", id, task });
    });

    api.on("delete-task", ({ id }) => {
      actorRef.send({ type: "TASK_DELETED", id });
    });

    api.on("add-link", ({ link }) => {
      actorRef.send({ type: "LINK_ADDED", link });
    });

    api.on("update-link", ({ id, link }) => {
      actorRef.send({ type: "LINK_UPDATED", id, link });
    });

    api.on("delete-link", ({ id }) => {
      actorRef.send({ type: "LINK_DELETED", id });
    });
  }, [api, actorRef]);

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

Key changes:

- **`useActorRef()`** — Gets a reference to the running machine actor, which we use to send events
- **Event handlers** — Each Gantt event is mapped to an XState event using `actorRef.send()`
- **`inProgress` check** — During drag operations, the Gantt fires multiple `update-task` events. We only want to persist the final state.

Now every edit, addition, or deletion is logged by our machine's actions. Open the browser console and try editing a task — you'll see persistence logs appear.

## Cross-Component Communication

The selection handler we added (`api.on("select-task", ...)`) sends an event that updates `selectedTaskId` in the machine's context. This enables other components to react when the user selects a task in the Gantt.

Create a component that displays the current selection:

`src/components/TaskDetails.tsx`:

```tsx
import { GanttMachineContext } from "../machine";

export default function TaskDetails() {
  const selectedTaskId = GanttMachineContext.useSelector(
    (state) => state.context.selectedTaskId
  );

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
import { GanttMachineContext } from "./machine";
import GanttChart from "./components/GanttChart";
import TaskDetails from "./components/TaskDetails";

export default function App() {
  return (
    <GanttMachineContext.Provider>
      <div className="demo-container">
        <header className="demo-header">
          <h1>SVAR Gantt in React + Vite</h1>
          <p>A showcase of @svar-ui/react-gantt component integration with Vite</p>
        </header>
        <main className="demo-main">
          <GanttChart />
        </main>
        <TaskDetails />
      </div>
    </GanttMachineContext.Provider>
  );
}
```

This component knows nothing about the Gantt — it just reads from the XState machine's context using `useSelector`. In a real application, this could be a details panel, a comments section, or any UI that needs to respond to the user's current focus in the Gantt.

Don't forget to add styles for the footer in `src/index.css`:

```css
.task-details {
  padding: 0.75rem 1.5rem;
  border-top: 1px solid #e5e5e5;
  background: #f9f9f9;
  color: #666;
  font-size: 0.875rem;
}
```

### Avoiding Unnecessary Re-renders

If you test the app now, you might notice something odd: selecting a task doesn't work correctly anymore. This happens because our selector returns the entire context object:

```tsx
const { tasks, links, scales } = GanttMachineContext.useSelector(
  (state) => state.context
);
```

Even though we only destructure `tasks`, `links`, and `scales`, the selector returns a new object reference whenever *any* part of the context changes — including `selectedTaskId`. Since XState uses `===` comparison by default, a new object reference triggers a re-render.

The fix is to use separate selectors for each piece of state:

```tsx
const tasks = GanttMachineContext.useSelector((state) => state.context.tasks);
const links = GanttMachineContext.useSelector((state) => state.context.links);
const scales = GanttMachineContext.useSelector((state) => state.context.scales);
```

Now each selector returns a primitive reference (the array itself), which only changes when that specific data is modified. Selection changes no longer cause the `GanttChart` component to re-render.

## Simplifying Event Forwarding

Looking at our `GanttChart.tsx`, there's a lot of repetitive code wiring individual Gantt events to XState events. Each handler follows the same pattern: receive an event from Gantt, send it to the machine.

The Gantt API provides a cleaner approach using `setNext`. Instead of subscribing to each event individually, we can forward all events with a single call:

```tsx
useEffect(() => {
  if (!api) return;

  api.setNext({
    exec(name: string, ev: Record<string, unknown>) {
      actorRef.send({ type: name, ...ev });
    },
  });
}, [api, actorRef]);
```

The `setNext` method registers a handler that receives all Gantt actions. The `exec` function is called with:
- `name` — The action name (e.g., `"select-task"`, `"add-task"`, `"update-task"`)
- `ev` — The event payload containing all relevant data

We simply forward these to XState by constructing an event with `type: name` and spreading the payload.

### Updating the Machine

For this to work, the machine's event types must match Gantt's action names. Update `src/machine/ganttMachine.ts` to use Gantt's native naming:

```tsx
// Event types - using Gantt's native action names
type GanttEvent =
  | { type: "select-task"; id: TID | null }
  | { type: "add-task"; task: Partial<ITask> }
  | { type: "update-task"; id: TID; task: Partial<ITask>; inProgress?: boolean }
  | { type: "delete-task"; id: TID }
  | { type: "add-link"; link: Partial<ILink> }
  | { type: "update-link"; id: TID; link: Partial<ILink> }
  | { type: "delete-link"; id: TID };
```

And update the state transitions to use these names:

```tsx
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
```

### Handling inProgress in the Machine

Remember the `inProgress` check we had for `update-task`? Now it moves to the machine's action, where it belongs:

```tsx
logTaskUpdated: ({ event }) => {
  if (event.type !== "update-task") return;
  if (event.inProgress) return; // Skip intermediate drag states
  console.log("[Persistence] Task updated:", { id: event.id, task: event.task });
},
```

This is actually better design — the component is now a simple forwarder, and all business logic lives in the state machine.

### Final GanttChart Component

Here's the complete simplified component with optimized selectors:

```tsx
import { useEffect, useState } from "react";
import type { IApi } from "@svar-ui/react-gantt";
import { Gantt, Willow, Editor, Toolbar } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";
import { GanttMachineContext } from "../machine";

export default function GanttChart() {
  const actorRef = GanttMachineContext.useActorRef();
  const tasks = GanttMachineContext.useSelector((state) => state.context.tasks);
  const links = GanttMachineContext.useSelector((state) => state.context.links);
  const scales = GanttMachineContext.useSelector((state) => state.context.scales);
  const [api, setApi] = useState<IApi | undefined>(undefined);

  useEffect(() => {
    if (!api) return;

    const handler = {
      exec(name: string, ev: Record<string, unknown>) {
        actorRef.send({ type: name, ...ev } as any);
      },
    } as any;
    api.setNext(handler);
  }, [api, actorRef]);

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

Note the `as any` type assertions on the handler and event. The Gantt API expects a specific handler interface, and we're forwarding events generically to XState which has its own event type constraints. These assertions bridge the two type systems without requiring a complex type mapping.

The `useEffect` block went from ~30 lines of individual event handlers to just 6 lines. If Gantt adds new events in the future, they'll automatically flow to your machine without any component changes.

## Summary and Next Steps

In this tutorial we integrated the SVAR Gantt with XState using the **Stateful Island** pattern:

- **Initial data** is stored in the machine's context and passed to the Gantt on mount
- **The Gantt owns runtime state** — edits happen instantly without round-trips through XState
- **Events** (`add-task`, `update-task`, etc.) are sent to the machine for persistence but don't modify the machine's context
- **Actions** in the machine intercept these events to sync with your backend (currently just logging)
- **Cross-component state** (like `selectedTaskId`) lives in the machine's context for other components to consume

This architecture keeps the UI responsive while maintaining a clear data flow.

### Next Steps for a Real Application

**Data fetching** — Use XState's `invoke` to load data from your API when the machine starts:

```tsx
export const ganttMachine = setup({
  // ... types and actions
}).createMachine({
  id: "gantt",
  initial: "loading",
  context: {
    tasks: [],
    links: [],
    scales: initialScales,
    selectedTaskId: null,
  },
  states: {
    loading: {
      invoke: {
        src: "fetchGanttData",
        onDone: {
          target: "ready",
          actions: assign({
            tasks: ({ event }) => event.output.tasks,
            links: ({ event }) => event.output.links,
          }),
        },
        onError: "error",
      },
    },
    ready: {
      // ... existing event handlers
    },
    error: {
      // Handle loading errors
    },
  },
});
```

**Persistence** — Replace the `console.log` calls in the actions with actual API requests. XState actions can be async, or you can use `invoke` for more complex persistence flows.

**Error handling** — Add error states to your machine and display notifications when persistence fails. The Gantt will still show the local changes, but users should know if their edits weren't saved.

