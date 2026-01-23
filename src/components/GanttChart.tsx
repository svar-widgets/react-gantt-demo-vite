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
