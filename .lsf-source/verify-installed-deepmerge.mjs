import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = name => readFileSync(join(root, name))
const sha = value => createHash('sha256').update(value).digest('hex')
const archive = 'file:.lsf-source/deepmerge-4.3.1-lsf-prototype-v1.tar'
assert.equal(sha(read('.lsf-source/deepmerge-4.3.1-lsf-prototype-v1.tar')), 'c4ca0f4eb3a2464c026bc3dec5d9eaf04544aed24c3fd1d77da95f85e36c369f')
const owner = JSON.parse(read('package.json'))
const lock = JSON.parse(read('package-lock.json'))
assert.equal(owner.devDependencies.deepmerge, archive)
assert.equal(lock.packages[''].devDependencies.deepmerge, archive)
assert.equal(lock.packages['node_modules/deepmerge'].version, '4.3.1')
assert.equal(lock.packages['node_modules/deepmerge'].resolved, archive)
assert.equal(lock.packages['node_modules/deepmerge'].integrity, 'sha512-w9M3UphEGYK/Zn9kkYnPVw7NnQyxE3T7gIcqBv3m4/Fe+LAhnAPZBwgYCqj0/orv2GagYhPGa2OMjqdzp7G0Lg==')
const repairRaw = read('.lsf-source/deepmerge-4.3.1-lsf-prototype-v1.repair.json')
const repairText = repairRaw.toString('utf8').replaceAll('\r\n', '\n')
assert.equal(sha(Buffer.from(repairText)), 'e402617d1e791c4bed35768b6c34ba68c370c076551495e738de0731ad2049c7')
const repair = JSON.parse(repairText)
assert.deepEqual(repair.files.map(row => row.path).sort(), ['dist/cjs.js', 'dist/umd.js', 'index.js'])
const require = createRequire(join(root, 'package.json'))
const installed = dirname(require.resolve('deepmerge/package.json'))
const manifest = JSON.parse(readFileSync(join(installed, 'package.json')))
assert.equal(manifest.name, 'deepmerge')
assert.equal(manifest.version, '4.3.1')
assert.equal(manifest.license, 'MIT')
const actual = {}
for (const row of repair.files) {
  actual[row.path] = sha(readFileSync(join(installed, row.path)))
  assert.equal(actual[row.path], row.afterSha256)
}
console.log(JSON.stringify({
  kind: 'installed-source-assertion',
  sourceCommit: process.env.GITHUB_SHA || null,
  node: process.versions.node,
  packageVersion: manifest.version,
  repairSha256: sha(Buffer.from(repairText)),
  installedPostimages: actual,
  actionBuildOrSignedSDKQualified: false
}))

