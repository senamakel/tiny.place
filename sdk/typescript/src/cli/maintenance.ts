import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { boolFlag, stringFlag } from "./args.js";
import { PACKAGE_NAME } from "./types.js";
import type { CliContext, Flags } from "./types.js";

const execFileAsync = promisify(execFile);

export async function selfUpdate(flags: Flags): Promise<unknown> {
  const packageManager = stringFlag(flags, "pm") ?? "npm";
  const target = `${PACKAGE_NAME}@${stringFlag(flags, "tag") ?? "latest"}`;
  const args = installArgs(packageManager, target);
  const command = `${packageManager} ${args.join(" ")}`;
  if (boolFlag(flags, "dry-run")) {
    return { command, dryRun: true };
  }
  try {
    const { stdout, stderr } = await execFileAsync(packageManager, args, { timeout: 180_000 });
    return { command, ok: true, stdout: stdout.trim(), ...(stderr.trim() ? { stderr: stderr.trim() } : {}) };
  } catch (error) {
    const detail = error as { stdout?: string; stderr?: string; message?: string };
    throw Object.assign(new Error(`update failed: ${detail.stderr?.trim() || detail.message}`), {
      body: { command, stdout: detail.stdout?.trim(), stderr: detail.stderr?.trim() },
    });
  }
}

function installArgs(packageManager: string, target: string): Array<string> {
  switch (packageManager) {
    case "pnpm":
      return ["add", "-g", target];
    case "yarn":
      return ["global", "add", target];
    case "bun":
      return ["add", "-g", target];
    default:
      return ["install", "-g", target];
  }
}

export async function cliVersionInfo(ctx: CliContext, flags: Flags): Promise<unknown> {
  const version = await readCliVersion();
  if (!boolFlag(flags, "check")) {
    return { version };
  }
  const latest = await fetchLatestVersion(ctx.fetch);
  return { version, latest, updateAvailable: latest !== null && latest !== version };
}

export async function readCliVersion(): Promise<string> {
  try {
    // src/cli/maintenance.ts and dist/cli/maintenance.js are both two levels
    // below the package root, so ../../package.json resolves in source and build.
    const packageUrl = new URL("../../package.json", import.meta.url);
    const pkg = JSON.parse(await readFile(packageUrl, "utf8")) as { version?: string };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

async function fetchLatestVersion(fetchImpl?: typeof globalThis.fetch): Promise<string | null> {
  const doFetch = fetchImpl ?? globalThis.fetch;
  try {
    const response = await doFetch(`https://registry.npmjs.org/${PACKAGE_NAME}/latest`);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { version?: unknown };
    return typeof data.version === "string" ? data.version : null;
  } catch {
    return null;
  }
}
