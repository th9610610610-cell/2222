import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const req = createRequire(import.meta.url)
globalThis.require = req

// resolve esbuild from the api-server workspace where it's a devDependency
const esbuildPath = path.resolve(__dirname, 'artifacts/api-server/node_modules/esbuild/lib/main.js')
const { build } = await import(esbuildPath)

await build({
  entryPoints: [path.resolve(__dirname, 'artifacts/api-server/src/vercel-handler.ts')],
  platform: 'node',
  bundle: true,
  format: 'cjs',
  outfile: path.resolve(__dirname, 'api/index.js'),
  external: [
    '*.node','sharp','better-sqlite3','canvas','bcrypt','argon2','fsevents',
    're2','farmhash','bufferutil','utf-8-validate','pg-native',
    'handlebars','knex','typeorm','onnxruntime-node','@prisma/client',
    'dd-trace','piscina','sequelize','mysql2','newrelic','electron',
    'playwright','puppeteer','miniflare','wrangler',
  ],
})
console.log('API bundle built.')
