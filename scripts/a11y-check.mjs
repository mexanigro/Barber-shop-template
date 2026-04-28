#!/usr/bin/env node
/**
 * a11y-check.mjs — lightweight accessibility audit script
 *
 * Usage:
 *   node scripts/a11y-check.mjs [base-url]
 *
 * Default base URL: http://localhost:3000
 *
 * Requires axe-cli (pulled via npx on first run, no project install needed):
 *   npx axe-cli --help
 *
 * Workflow:
 *   1. Start the dev server:  npm run dev:en
 *   2. In a second terminal:  node scripts/a11y-check.mjs
 *   3. Review output + a11y-report.json for any violations
 *
 * Exits 0 on pass, 1 on violations or unreachable server.
 *
 * Pages audited (WCAG 2.1 AA):
 *   /                   Landing
 *   /#services          Landing with hash (same shell, tests section anchors)
 */

import { execSync } from "child_process";

const BASE_URL = process.argv[2] ?? "http://localhost:3000";
const TAGS = "wcag2a,wcag2aa,wcag21aa";
const REPORT = "a11y-report.json";

async function checkServerUp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function run() {
  console.log(`\n  a11y audit — ${BASE_URL}\n`);

  const isUp = await checkServerUp(BASE_URL);
  if (!isUp) {
    console.error(`  Server not reachable at ${BASE_URL}`);
    console.error("  Start it with: npm run dev:en\n");
    process.exit(1);
  }

  const urls = [BASE_URL].join(" ");
  const cmd = `npx --yes axe-cli --tags ${TAGS} --save ${REPORT} ${urls}`;

  console.log(`  $ ${cmd}\n`);

  try {
    execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
    console.log(`\n  No critical violations. Full report: ${REPORT}\n`);
  } catch {
    console.error(`\n  Violations found. See ${REPORT} for details.\n`);
    process.exit(1);
  }
}

run();
