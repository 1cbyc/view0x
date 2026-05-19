import type { ShieldSnapshot } from "@/services/api";

const KEY = "view0x_shield_history";
const MAX = 20;

export type ShieldHistoryEntry = ShieldSnapshot;

export function loadShieldHistory(): ShieldHistoryEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ShieldHistoryEntry[];
  } catch {
    return [];
  }
}

export function pushShieldHistory(snapshot: ShieldSnapshot): void {
  if (typeof localStorage === "undefined") return;
  const prev = loadShieldHistory().filter(
    (e) =>
      !(
        e.address.toLowerCase() === snapshot.address.toLowerCase() &&
        e.chainId === snapshot.chainId
      ),
  );
  const next = [snapshot, ...prev].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
}
