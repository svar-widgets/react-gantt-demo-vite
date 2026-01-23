import { useAtomValue } from "jotai";
import { selectedTaskIdAtom } from "../store";

export default function TaskDetails() {
  const selectedTaskId = useAtomValue(selectedTaskIdAtom);

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
