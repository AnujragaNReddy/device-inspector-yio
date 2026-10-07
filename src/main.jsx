import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider, RequireAuth } from './useAuth';
import "./styles.css";

// Sign-in stays off until VITE_AUTH_URL is set, so deploying this ahead of
// the auth service changes nothing. There is no backend in this app, so
// there is no token to attach to anything - the gate is the whole of it, and
// it keeps the page from being usable by someone who is not signed in. It is
// not a substitute for server-side checks, because there is no server here
// to check anything.
const AUTH_URL = import.meta.env.VITE_AUTH_URL;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {AUTH_URL ? (
      <AuthProvider issuer={AUTH_URL} client="device-inspector">
        <RequireAuth fallback={<p className="auth-loading">Checking your session…</p>}>
          <App />
        </RequireAuth>
      </AuthProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
