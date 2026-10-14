import { createRoot, hydrateRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { findPublicPage } from "./data/publicPages.js";

const root = document.getElementById("root");
const app = <ToastProvider><AuthProvider><CartProvider><App /></CartProvider></AuthProvider></ToastProvider>;
if (root.dataset.prerendered === "true" && findPublicPage(window.location.pathname)) hydrateRoot(root, app);
else createRoot(root).render(app);
