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
