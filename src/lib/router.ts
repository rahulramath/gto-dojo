import { useSyncExternalStore } from "react";

const getHash = () => window.location.hash.slice(1) || "/";

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

export function useRoute(): { path: string; params: URLSearchParams } {
  const hash = useSyncExternalStore(subscribe, getHash, () => "/");
  const [path, q] = hash.split("?");
  return { path: path || "/", params: new URLSearchParams(q ?? "") };
}

export function navigate(to: string): void {
  if (window.location.hash.slice(1) === to) return;
  window.location.hash = to;
  window.scrollTo({ top: 0 });
}
