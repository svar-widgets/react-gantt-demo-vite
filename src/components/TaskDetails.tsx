import { observer } from "mobx-react-lite";
import { useGanttStore } from "../store";

function TaskDetails() {
  const store = useGanttStore();

  return (
    <footer className="task-details">
      {store.selectedTaskId ? (
        <span>Selected task ID: {store.selectedTaskId}</span>
      ) : (
        <span>No task selected</span>
      )}
    </footer>
  );
}

export default observer(TaskDetails);
