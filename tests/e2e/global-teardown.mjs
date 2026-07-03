import { execSync } from "node:child_process";

function killPort(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8", shell: true });
    const pids = new Set();
    for (const line of output.split(/\r?\n/)) {
      const match = line.trim().match(/\s(\d+)\s*$/);
      const pid = match ? Number(match[1]) : 0;
      if (pid > 4) pids.add(pid);
    }
    for (const pid of pids) {
      execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore", shell: true });
    }
  } catch {
    // Port already free.
  }
}

export default async function globalTeardown() {
  if (process.env["PLAYWRIGHT_REUSE_SERVER"] === "1") return;
  killPort(3002);
  killPort(8081);
}
