import { appPath, APP_BASE_PATH, loginReturnPath } from "@/lib/app-path";
import { getUrologicsApiUrl } from "@/lib/urologics-api";

export function mainLoginUrl(requested: string | null = null, signup = false) {
  const login = new URL(getUrologicsApiUrl("/login"));
  const route = loginReturnPath(requested);
  let pathname = route.split(/[?#]/)[0];
  try { pathname = decodeURIComponent(pathname); } catch { pathname = "/"; }
  const destination = pathname.replace(/\/+$/, "") === "/login" || route === "/"
    ? APP_BASE_PATH || "/"
    : appPath(route);
  login.searchParams.set("redirect", destination);
  login.searchParams.set("mode", signup ? "signup" : "login");
  return login.toString();
}
