const DEFAULT_LOCAL_API = "http://localhost:8000";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const envValue = import.meta.env.VITE_API_URL?.trim();
  if (envValue) {
    return trimTrailingSlash(envValue);
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return DEFAULT_LOCAL_API;
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

export function getWsUrl(path: string = "/ws"): string {
  const envValue = import.meta.env.VITE_WS_URL?.trim();
  if (envValue) {
    return envValue;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}${normalizedPath}`;
  }

  return `${DEFAULT_LOCAL_API.replace(/^http/i, "ws")}${normalizedPath}`;
}
