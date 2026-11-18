import ReactDOM from "react-dom/client";
// First: the language is known before anything renders
import "@utils/i18n";
import "@styles/variables.scss";
import "./index.scss";
import Root from "./Root.tsx";
import { applyIosShell } from "@utils/iosShell";

applyIosShell();

ReactDOM.createRoot(document.getElementById("root")!).render(<Root />);
