// scripts/fix-jose.mjs — patches jwks-rsa to use a CJS-compatible jose version.
// This runs as a prebuild step to fix the ERR_REQUIRE_ESM error on Vercel.
// The issue: jose@6 is ESM-only, but jwks-rsa@4 require()'s it, which crashes.
// Fix: replace jose@6 with jose@5 (which supports require()) in node_modules.

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

console.log("[fix-jose] Checking for jose@6 (ESM-only) to replace with jose@5 (CJS)...");

// Find all jose@6 installations in pnpm store
const pnpmDir = join(process.cwd(), "node_modules", ".pnpm");
if (!existsSync(pnpmDir)) {
  console.log("[fix-jose] No .pnpm directory found, skipping.");
  process.exit(0);
}

const joseDirs = readdirSync(pnpmDir).filter(d => d.startsWith("jose@6"));
if (joseDirs.length === 0) {
  console.log("[fix-jose] jose@6 not found — override already working. ✅");
  process.exit(0);
}

console.log(`[fix-jose] Found ${joseDirs.length} jose@6 installation(s). Patching...`);

// Find jose@5 to copy from
const jose5Dir = readdirSync(pnpmDir).find(d => d.startsWith("jose@5"));
if (!jose5Dir) {
  console.error("[fix-jose] jose@5 not found — cannot patch. Install jose@5 first.");
  process.exit(1);
}

const jose5Path = join(pnpmDir, jose5Dir, "node_modules", "jose");
console.log(`[fix-jose] Using jose@5 from: ${jose5Path}`);

// For each jose@6 installation, replace its contents with jose@5
for (const jose6Dir of joseDirs) {
  const jose6Path = join(pnpmDir, jose6Dir, "node_modules", "jose");
  console.log(`[fix-jose] Patching: ${jose6Path}`);

  // Read jose@5 package.json to get version
  const pkg5 = JSON.parse(readFileSync(join(jose5Path, "package.json"), "utf8"));

  // Delete jose@6 contents
  rmSync(jose6Path, { recursive: true, force: true });
  mkdirSync(jose6Path, { recursive: true });

  // Copy jose@5 files
  copyDir(jose5Path, jose6Path);

  // Update package.json to reflect version 5
  const pkg6 = JSON.parse(readFileSync(join(jose6Path, "package.json"), "utf8"));
  pkg6.version = pkg5.version;
  pkg6.type = undefined; // Remove "type": "module"
  writeFileSync(join(jose6Path, "package.json"), JSON.stringify(pkg6, null, 2));

  console.log(`[fix-jose] ✅ Replaced jose@6 with jose@${pkg5.version} (CJS) at ${jose6Path}`);
}

console.log("[fix-jose] Done. All jose@6 installations patched to CJS jose@5.");

function copyDir(src, dest) {
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      writeFileSync(destPath, readFileSync(srcPath));
    }
  }
}
