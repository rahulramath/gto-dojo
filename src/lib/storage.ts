import { todayKey } from "./format";

const ASKED_KEY = "gto-dojo-persist-asked";

interface PersistApi {
  persisted: () => Promise<boolean>;
  persist: () => Promise<boolean>;
}

function api(): PersistApi | null {
  const s = (globalThis.navigator as Navigator | undefined)?.storage as Partial<PersistApi> | undefined;
  return s && typeof s.persist === "function" && typeof s.persisted === "function" ? (s as PersistApi) : null;
}

/** Whether the browser has promised not to clear saved progress on its own. Null means it can't. */
export async function isPersisted(): Promise<boolean | null> {
  const s = api();
  if (!s) return null;
  try {
    return await s.persisted();
  } catch {
    return null;
  }
}

export async function requestPersist(): Promise<boolean | null> {
  const s = api();
  if (!s) return null;
  try {
    return (await s.persisted()) || (await s.persist());
  } catch {
    return false;
  }
}

function askedToday(): boolean {
  try {
    const today = todayKey();
    if (localStorage.getItem(ASKED_KEY) === today) return true;
    localStorage.setItem(ASKED_KEY, today);
  } catch {
    return false;
  }
  return false;
}

/** Firefox shows a permission prompt for this, so ask at most once a day. */
export async function maybeRequestPersist(): Promise<boolean | null> {
  const persisted = await isPersisted();
  if (persisted !== false) return persisted;
  if (askedToday()) return false;
  return requestPersist();
}
