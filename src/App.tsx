import GanttChart from "./components/GanttChart";
import TaskDetails from "./components/TaskDetails";

export default function App() {
  return (
    <div className="demo-container">
      <header className="demo-header">
        <h1>SVAR Gantt in React + Vite</h1>
        <p>A showcase of @svar-ui/react-gantt component integration with Valtio</p>
      </header>
      <main className="demo-main">
        <GanttChart />
      </main>
      <TaskDetails />
    </div>
  );
}
