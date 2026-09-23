import { afterEach, describe, expect, it, vi } from "vitest";
import { isPersisted, maybeRequestPersist, requestPersist } from "./storage";

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("persistent storage", () => {
  it("returns null when the browser can't persist storage", async () => {
    vi.stubGlobal("navigator", {});
    expect(await isPersisted()).toBeNull();
    expect(await requestPersist()).toBeNull();
    expect(await maybeRequestPersist()).toBeNull();
  });

  it("doesn't ask again once storage is persistent", async () => {
    const persist = vi.fn(async () => true);
    vi.stubGlobal("navigator", { storage: { persisted: async () => true, persist } });
    vi.stubGlobal("localStorage", memoryStorage());
    expect(await maybeRequestPersist()).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  it("asks at most once a day", async () => {
    const persist = vi.fn(async () => false);
    vi.stubGlobal("navigator", { storage: { persisted: async () => false, persist } });
    vi.stubGlobal("localStorage", memoryStorage());
    await maybeRequestPersist();
    await maybeRequestPersist();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("returns true when the browser agrees", async () => {
    vi.stubGlobal("navigator", { storage: { persisted: async () => false, persist: async () => true } });
    vi.stubGlobal("localStorage", memoryStorage());
    expect(await maybeRequestPersist()).toBe(true);
  });
});
