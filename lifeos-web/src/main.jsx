import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./app/App";
import { AuthProvider } from "./shared/auth/AuthProvider";

ReactDOM.createRoot(document.getElementById("root")).render(
  <div style={{ padding: 40, fontFamily: "system-ui" }}>
    LifeOS mounted ✅
  </div>
);
