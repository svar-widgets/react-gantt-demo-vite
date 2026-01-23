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
  const tasks = useMemo(() => tasksFromStore.map(a => ({ ...a })), [tasksFromStore]);
  const links = useAppSelector(selectLinks);
  const scales = useAppSelector(selectScales);

  const [api, setApi] = useState<IApi | undefined>(undefined);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!api) return;

    // Selection state - stored in Redux for cross-component access
    api.on("select-task", ({ id }) => {
      dispatch(taskSelected(id as number));
    });

    // Data mutations - dispatched for persistence middleware
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
