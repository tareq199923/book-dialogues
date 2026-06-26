import path from "path";

/**
 * Returns the root directory for file-based data storage.
 *
 * - **Local development:** `project-root/data/` — persistent, gitignored
 * - **Vercel serverless:** `/tmp/data/` — ephemeral, writable per-invocation
 *
 * On Vercel, the deployment filesystem is read-only, so writes must
 * go to `/tmp`. Data persists only within a single function instance.
 */
function getDataDir(): string {
  if (process.env.VERCEL === "1") {
    return path.join("/tmp", "data");
  }
  return path.join(process.cwd(), "data");
}

export const DATA_DIR = getDataDir();
