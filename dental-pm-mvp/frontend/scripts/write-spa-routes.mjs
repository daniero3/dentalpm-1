import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "..", "dist");
const indexPath = join(distDir, "index.html");

const routes = [
  "landing",
  "login",
  "register",
  "privacy",
  "terms",
  "payment-validation",
  "subscription-expired",
];

if (!existsSync(indexPath)) {
  throw new Error("dist/index.html is missing. Run vite build before writing SPA routes.");
}

for (const route of routes) {
  const routeDir = join(distDir, route);
  mkdirSync(routeDir, { recursive: true });
  copyFileSync(indexPath, join(routeDir, "index.html"));
}

console.log(`[Build] SPA route fallbacks generated: ${routes.join(", ")}`);
