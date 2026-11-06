// Builds the package in the current directory into dist/: `npm run build` in packages/<name>.
// tsc rewrites `./x.ts` imports to `./x.js` in the emitted JS (rewriteRelativeImportExtensions) but not in
// the emitted .d.ts files; they are pointed at the .js files here, so consumers resolve the declarations
// under any moduleResolution, not only with allowImportingTsExtensions.
import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dist = 'dist'
rmSync(dist, { recursive: true, force: true })
// npm puts the workspace's node_modules/.bin on PATH; through a shell it finds tsc.cmd on Windows too.
execSync('tsc -p tsconfig.build.json', { stdio: 'inherit' })

const specifier = /(from\s+|import\s*\(\s*|import\s+)(['"])(\.{1,2}\/[^'"]+?)\.tsx?\2/g
for (const entry of readdirSync(dist, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.d.ts')) continue
  const file = join(entry.parentPath, entry.name)
  const text = readFileSync(file, 'utf8')
  const fixed = text.replace(specifier, '$1$2$3.js$2')
  if (fixed !== text) writeFileSync(file, fixed)
}
