/**
 * Browser-local hint that an admin has signed in here before. Public pages only ask
 * `/api/admin/me` when it is set, so ordinary visitors don't trigger a 401 per page view.
 * It is a hint, not auth: the server still decides on every admin request.
 */
const ADMIN_HINT_KEY = "skytravel:admin-hint";

export function hasAdminHint(): boolean {
  try {
    return window.localStorage.getItem(ADMIN_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAdminHint(active: boolean): void {
  try {
    if (active) window.localStorage.setItem(ADMIN_HINT_KEY, "1");
    else window.localStorage.removeItem(ADMIN_HINT_KEY);
  } catch {
    // storage unavailable (private mode): the admin link simply stays hidden
  }
}
