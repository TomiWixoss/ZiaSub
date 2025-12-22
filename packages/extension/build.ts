// Auto-build all entry points in src/*/index.ts
import { readdirSync, statSync, existsSync } from "fs";
import { join } from "path";

const srcDir = "./src";
const outBase = "./public/dist";

// Find all directories in src that have index.ts
const entries = readdirSync(srcDir)
  .filter((name) => {
    const dirPath = join(srcDir, name);
    const indexPath = join(dirPath, "index.ts");
    return statSync(dirPath).isDirectory() && existsSync(indexPath);
  })
  .filter((name) => name !== "types" && name !== "utils"); // Skip non-entry dirs

console.log(`[ZiaSub] Building ${entries.length} entry points...`);

// Build each entry
for (const entry of entries) {
  const entryPath = join(srcDir, entry, "index.ts");
  const outDir = join(outBase, entry);

  console.log(`  → ${entry}`);

  await Bun.build({
    entrypoints: [entryPath],
    outdir: outDir,
    target: "browser",
    minify: false,
  });
}

console.log("[ZiaSub] Build complete!");
