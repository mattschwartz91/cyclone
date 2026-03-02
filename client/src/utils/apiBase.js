// Centralized API base URL selection for the frontend.
//
// - In local dev, default to the local Express server.
// - In production builds, require VITE_API_BASE_URL (or REACT_APP_API_BASE_URL) to be set
//   by the hosting environment; otherwise use relative URLs (same-origin).

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  const raw = (import.meta.env.VITE_API_BASE_URL || import.meta.env.REACT_APP_API_BASE_URL || "").trim();
  if (raw) return normalizeBaseUrl(raw);

  // Dev fallback to local backend.
  if (import.meta.env.DEV) return "http://localhost:3000";

  // Production: leave empty to encourage explicit configuration.
  return "";
}

export const API_BASE_URL = getApiBaseUrl();

