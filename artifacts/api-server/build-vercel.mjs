import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { rm } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(artifactDir, "../..");
const outfile = path.resolve(root, "api/index.js");

await rm(outfile, { force: true });

await esbuild({
  entryPoints: [path.resolve(artifactDir, "src/vercel-handler.ts")],
  platform: "node",
  bundle: true,
  format: "cjs",
  outfile,
  logLevel: "info",
  external: [
    "*.node", "sharp", "better-sqlite3", "canvas", "bcrypt", "argon2",
    "fsevents", "re2", "farmhash", "bufferutil", "utf-8-validate",
    "pg-native", "handlebars", "knex", "typeorm",
    "onnxruntime-node", "@prisma/client", "dd-trace", "piscina",
    "sequelize", "mysql2", "newrelic", "electron", "playwright",
    "puppeteer", "miniflare", "wrangler", "cpu-features", "ssh2",
  ],
  sourcemap: false,
});

console.log("✓ Vercel API bundle written to", outfile);
