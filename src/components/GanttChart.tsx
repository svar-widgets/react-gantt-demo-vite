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
