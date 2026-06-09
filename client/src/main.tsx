//enter to the app, render the whole app
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { AuthProvider } from './context/AuthContext'
const rootElement = document.getElementById("root");

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <AuthProvider>
      <App />
      </AuthProvider>
    </React.StrictMode>
  );
} else {
  console.error("not found element id='root'");
}
