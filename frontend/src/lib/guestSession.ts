const GUEST_SESSION_KEY = "view0x_guest_session";

export function clearDashboardCache(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("view0x_dashboard_cache");
  }
}

export function getGuestSessionId(): string {
  if (typeof localStorage === "undefined") {
    return "";
  }
  let id = localStorage.getItem(GUEST_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_SESSION_KEY, id);
  }
  return id;
}
