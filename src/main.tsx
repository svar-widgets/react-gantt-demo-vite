import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GanttStoreProvider, ganttStore } from "./store";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GanttStoreProvider value={ganttStore}>
      <App />
    </GanttStoreProvider>
  </StrictMode>
);
