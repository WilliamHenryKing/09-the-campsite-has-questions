import { createRoot } from "react-dom/client";
import { worldFailed } from "./loader";
import { App } from "./ui/App";
import "./ui/styles.css";

const root = document.getElementById("root");
if (root) {
  root.inert = true;
  const reactRoot = createRoot(root);
  let failed = false;
  const fail = () => {
    if (failed) return;
    failed = true;
    reactRoot.unmount();
    worldFailed();
  };
  reactRoot.render(<App onFailure={fail} />);
  import.meta.hot?.dispose(() => reactRoot.unmount());
}
