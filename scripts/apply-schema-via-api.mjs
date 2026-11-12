// Applies supabase/schema.sql via the Supabase Management API (no DB wire connection needed).
// Usage: node --env-file=.env.local scripts/apply-schema-via-api.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(path.join(__dirname, "..", "supabase", "schema.sql"), "utf8");

const projectRef = "gipinsbymgvafgvxppsx";
const pat = process.env.SUPABASE_ACCESS_TOKEN ?? process.env.SUPABASE_PAT;
if (!pat) {
  console.error("Set SUPABASE_ACCESS_TOKEN in .env.local first");
  process.exit(1);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${pat}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql }),
});

const text = await res.text();
console.log(`HTTP ${res.status}`);
console.log(text);
