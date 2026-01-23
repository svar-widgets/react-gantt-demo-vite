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
  }, [
    api,
    setSelectedTaskId,
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
