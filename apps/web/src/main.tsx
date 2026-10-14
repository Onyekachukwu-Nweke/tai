import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initializeTextSize } from "./accessibility-preferences";
import "./buttons.css";
import "./styles.css";
import "./learning-ui.css";
import "./material-ui.css";
import "./concept-map.css";
import "./focus-mode.css";
import "./flashcards.css";
import "./mobile-learning.css";
import "./layout-responsive.css";
import "./landing.css";
import "./demo-ui.css";
import "./icon-polish.css";
import "./final-composition.css";
import "./feedback.css";
import "./emotional-theme.css";

initializeTextSize();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
