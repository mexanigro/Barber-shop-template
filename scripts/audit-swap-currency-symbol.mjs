import fs from "fs";
import path from "path";

const files = [
  "src/components/booking/BookingWizard.tsx",
  "src/components/services/ServicesPage.tsx",
  "src/components/admin/MetricsDashboard.tsx",
  "src/components/admin/DashboardTab.tsx",
  "src/components/admin/PaymentsTab.tsx",
  "src/components/landing/Services.tsx",
  "src/components/landing/services/services-v5.tsx",
  "src/components/landing/services/services-v4.tsx",
  "src/components/landing/services/services-v2.tsx",
  "src/components/landing/services/services-v3.tsx",
  "src/components/landing/services/estetica/services-v2.tsx",
  "src/components/landing/services/estetica/services-v3.tsx",
  "src/components/landing/services/estetica/services-v5.tsx",
  "src/components/landing/services/estetica/services-v4.tsx",
];

for (const rel of files) {
  const abs = path.resolve(rel);
  let src = fs.readFileSync(abs, "utf8");
  if (!src.includes("localeConfig.currency.symbol")) {
    console.log(`SKIP (no usage): ${rel}`);
    continue;
  }
  // relative import depth from the file's dir to src/lib
  const dir = path.dirname(rel).replaceAll("\\", "/");
  const depth = dir.split("/").length - 1; // segments after "src"
  const prefix = "../".repeat(depth);
  const importLine = `import { currencySymbol } from "${prefix}lib/currency";`;

  src = src.replaceAll("localeConfig.currency.symbol", "currencySymbol()");
  if (!src.includes(importLine)) {
    // insert after the last top-of-file import statement
    const importRegex = /^import .*?;$/gm;
    let lastEnd = 0;
    for (const m of src.matchAll(importRegex)) lastEnd = m.index + m[0].length;
    src = src.slice(0, lastEnd) + "\n" + importLine + src.slice(lastEnd);
  }
  fs.writeFileSync(abs, src);
  console.log(`OK: ${rel}`);
}
