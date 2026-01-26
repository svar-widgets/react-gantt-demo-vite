import { useSnapshot } from "valtio";
import { ganttStore } from "../store";

export default function TaskDetails() {
  const { selectedTaskId } = useSnapshot(ganttStore);

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
