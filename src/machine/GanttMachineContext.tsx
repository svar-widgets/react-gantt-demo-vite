import { createActorContext } from "@xstate/react";
import { ganttMachine } from "./ganttMachine";

export const GanttMachineContext = createActorContext(ganttMachine);
