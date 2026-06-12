export const APP_BASE_PATH = "/web";

export function appPath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${APP_BASE_PATH}${normalizedPath}`;
}
