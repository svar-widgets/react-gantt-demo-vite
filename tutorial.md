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

const tasks = [
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
  // ... more tasks
];

const links = [
  { id: 1, source: 2, target: 3, type: "e2s" },
];

const scales = [
  { unit: "month", step: 1, format: "%M %Y" },
  { unit: "week", step: 1, format: "Week %w" },
];

export default function GanttChart() {
  return (
    <div style={{ height: "600px", width: "100%" }}>
      <Gantt tasks={tasks} links={links} scales={scales} />
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

// ... tasks, links, scales definitions ...

export default function GanttChart() {
  return (
    <div style={{ height: "600px", width: "100%" }}>
      <Willow>
        <Gantt tasks={tasks} links={links} scales={scales} />
      </Willow>
    </div>
  );
}
```

That's more like it — styled headers, colored task bars, proper visual feedback.

## Fixing the Layout

If you're going for a flexible layout where the Gantt should fill available space (instead of our fixed 600px height), you might run into another issue. Let's try changing the container to use percentage height:

```tsx
<div style={{ height: "100%", width: "100%" }}>
  <Willow>
    <Gantt tasks={tasks} links={links} scales={scales} />
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

## Enabling Edit Operations

So far our Gantt displays tasks, but users can't edit them. Let's add an editor panel that allows modifying task properties.

The Gantt component exposes its API through an `init` callback. We can capture this reference and pass it to an `Editor` component:

```tsx
import { useState } from "react";
import { Gantt, Willow, Editor } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";

// ... tasks, links, scales definitions ...

export default function GanttChart() {
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

// ... tasks, links, scales definitions ...

export default function GanttChart() {
  const [api, setApi] = useState(null);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Willow>
        <Toolbar api={api} />
        <Gantt tasks={tasks} links={links} scales={scales} init={setApi} />
        {api && <Editor api={api} />}
      </Willow>
    </div>
  );
}
```

The toolbar appears above the Gantt and provides buttons for:

- Adding new tasks
- Deleting selected tasks
- Indenting/outdenting tasks (changing hierarchy)
- Expanding/collapsing task groups

Clicking these buttons triggers actions through the Gantt's API. With our static data setup, changes will be reflected in the UI but won't persist after a page refresh.

## Complete Component Code

Here's the full `GanttChart.tsx` with all pieces in place:

```tsx
import { useState } from "react";
import type { IApi } from "@svar-ui/react-gantt";
import { Gantt, Willow, Editor, Toolbar } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/all.css";

const tasks = [
  {
    id: 1,
    text: "Project Planning",
    start: new Date(2024, 0, 1),
    end: new Date(2024, 0, 10),
    progress: 100,
    type: "summary" as const,
    open: true,
  },
  {
    id: 2,
    text: "Requirements Gathering",
    start: new Date(2024, 0, 1),
    end: new Date(2024, 0, 5),
    progress: 100,
    parent: 1,
  }
];

const links = [
  { id: 1, source: 2, target: 3, type: "e2s" },
  { id: 2, source: 3, target: 5, type: "e2s" },
  { id: 3, source: 5, target: 6, type: "s2s" },
  { id: 4, source: 6, target: 7, type: "e2s" },
  { id: 5, source: 7, target: 8, type: "e2s" },
  { id: 6, source: 8, target: 9, type: "e2s" },
];

const scales = [
  { unit: "month", step: 1, format: "%M %Y" },
  { unit: "week", step: 1, format: "Week %w" },
];

export default function GanttChart() {
  const [api, setApi] = useState<IApi | undefined>(undefined);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Willow>
        <Toolbar api={api} />
        <Gantt tasks={tasks} links={links} scales={scales} init={setApi} />
        {api && <Editor api={api} />}
      </Willow>
    </div>
  );
}
```

## Next Steps

At this point you have a working Gantt chart with task editing and a toolbar. Here's where to go from here depending on what you want to build.

**Working with task data** — We used a simple array of tasks in this tutorial, but real applications need more. The [tasks API reference](https://docs.svar.dev/react/gantt/api/properties/tasks) covers all available task properties including custom fields, duration-based tasks, and handling different task types.

**Setting up dependencies** — Task links define how work flows through your project. The [links API reference](https://docs.svar.dev/react/gantt/api/properties/links) explains all dependency types and how to configure lag time between connected tasks.

**Customizing the editor** — The default editor works well, but you might want to add custom fields or change the layout. The [editor guide](https://docs.svar.dev/react/editor/guides/initialization) shows how to configure fields, validation, and create custom editor layouts.

**Formatting dates and scales** — The `%M %Y` format we used is just the beginning. The [localization guide](https://docs.svar.dev/react/core/guides/localization#date-and-time-format-specification) has the complete list of format specifiers and explains how to set up different locales.

**Adding a backend** — To persist changes, you'll need to connect the Gantt to a backend API. The `@svar-ui/gantt-data-provider` package provides a `RestDataProvider` that handles the communication. See the [REST routes documentation](https://docs.svar.dev/react/gantt/api/overview/restroutes_overview) for the expected endpoint formats.
