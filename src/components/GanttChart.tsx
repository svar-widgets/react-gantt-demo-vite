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
