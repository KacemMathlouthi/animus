/** Roll the flat vitest coverage summary up into a per-package / per-app table
 * (plus an overall total) and print it as Markdown. Used by CI to post a
 * coverage comment that shows where each workspace stands, not just one number.
 * Reads coverage/coverage-summary.json (produced by `bun run test:coverage`). */
import { readFileSync } from "node:fs";

type Metric = { total: number; covered: number };
type FileSummary = Record<"lines" | "statements" | "functions" | "branches", Metric>;

const METRICS = ["statements", "lines", "functions", "branches"] as const;

// Workspaces to bucket files into, longest-path-first so `apps/api` wins over `apps`.
const PACKAGES = [
  "apps/web",
  "apps/api",
  "packages/core",
  "packages/agent",
  "packages/db",
  "packages/auth",
];

function emptyAgg(): FileSummary {
  return {
    statements: { total: 0, covered: 0 },
    lines: { total: 0, covered: 0 },
    functions: { total: 0, covered: 0 },
    branches: { total: 0, covered: 0 },
  };
}

function bucket(path: string): string | null {
  return PACKAGES.find((pkg) => path.includes(`/${pkg}/`)) ?? null;
}

function pct(m: Metric): string {
  return m.total === 0 ? "—" : `${((m.covered / m.total) * 100).toFixed(1)}%`;
}

function row(name: string, agg: FileSummary, bold = false): string {
  const b = bold ? "**" : "";
  const cells = METRICS.map((k) => `${b}${pct(agg[k])}${b}`).join(" | ");
  return `| ${b}${name}${b} | ${cells} |`;
}

const summary: Record<string, FileSummary> = JSON.parse(
  readFileSync("coverage/coverage-summary.json", "utf8")
);

const byPackage = new Map<string, FileSummary>();
for (const [path, file] of Object.entries(summary)) {
  if (path === "total") {
    continue;
  }
  const pkg = bucket(path);
  if (!pkg) {
    continue;
  }
  const agg = byPackage.get(pkg) ?? emptyAgg();
  for (const k of METRICS) {
    agg[k].total += file[k].total;
    agg[k].covered += file[k].covered;
  }
  byPackage.set(pkg, agg);
}

const lines = [
  "## Coverage by workspace",
  "",
  "| Workspace | Statements | Lines | Functions | Branches |",
  "| --- | --- | --- | --- | --- |",
  ...PACKAGES.filter((pkg) => byPackage.has(pkg)).map((pkg) =>
    row(pkg, byPackage.get(pkg) as FileSummary)
  ),
  row("Total", summary.total as FileSummary, true),
  "",
  "_Report-only — no coverage gate. The web app is at 0% until it has tests._",
];

process.stdout.write(`${lines.join("\n")}\n`);
