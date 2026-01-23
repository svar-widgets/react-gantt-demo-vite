import { useAppSelector, selectSelectedTaskId } from "../store";

export default function TaskDetails() {
  const selectedTaskId = useAppSelector(selectSelectedTaskId);

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
