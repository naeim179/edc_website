/** Accept only object URLs from this project's public images bucket. */
export function getImageObjectPath(imageUrl: string, supabaseUrl: string): string | null {
  try {
    const url = new URL(imageUrl);
    const project = new URL(supabaseUrl);
    const prefix = "/storage/v1/object/public/images/";
    if (url.origin !== project.origin || !url.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    if (!path || path.includes("\\") || path.includes("\0") ||
        path.split("/").some(segment => !segment || segment === "." || segment === "..")) return null;
    return path;
  } catch {
    return null;
  }
}
