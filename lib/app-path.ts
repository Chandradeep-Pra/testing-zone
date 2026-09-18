export const APP_BASE_PATH =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_BASE_PATH !== undefined
    ? process.env.NEXT_PUBLIC_APP_BASE_PATH
    : "/web";

export function appPath(path: string) {
  // Browser URLs and upstream APIs must never receive the app's base path.
  if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith("//") || path.startsWith("#") || path.startsWith("?")) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (APP_BASE_PATH && new RegExp(`^${APP_BASE_PATH}(?:/|\\?|#|$)`).test(normalizedPath)) {
    return normalizedPath;
  }
  return `${APP_BASE_PATH}${normalizedPath}`;
}


// Next's router adds basePath itself. Only allow local return destinations.
export function loginReturnPath(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return "/";
  if (APP_BASE_PATH && (value === APP_BASE_PATH || value.startsWith(`${APP_BASE_PATH}/`))) {
    const route = value.slice(APP_BASE_PATH.length);
    if (route.startsWith("//")) return "/";
    return route.startsWith("/") ? route : `/${route}`;
  }
  return value;
}
