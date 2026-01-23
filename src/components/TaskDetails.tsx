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
