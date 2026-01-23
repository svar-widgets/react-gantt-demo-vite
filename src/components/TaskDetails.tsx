import { useGanttStore } from "../store";

export default function TaskDetails() {
  const selectedTaskId = useGanttStore((state) => state.selectedTaskId);

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
