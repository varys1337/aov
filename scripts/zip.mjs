import fs from 'node:fs'
import { ZipArchive } from 'archiver'

const files = [
  'aov.mjs',
  'changelog.md',
  'license.txt',
  'readme.md',
  'system.json'
]

const folders = [
  'art-assets',
  'css',
  'lang',
  'system',
  'templates'
]

const system = JSON.parse(fs.readFileSync('./system.json', { encoding: 'utf8' }))

const packs = system.packs.map(pack => 'packs/' + pack.name.toString())

const output = fs.createWriteStream('./aov.zip')

const archive = new ZipArchive({
  zlib: { level: 9 }
})

output.on('close', () => {
  console.log('Created aov.zip')
})

archive.on('error', (err) => {
  throw err
})

archive.pipe(output)

for (const file of files) {
  archive.append(fs.createReadStream(file), { name: file })
}

for (const folder of folders) {
  archive.directory(folder)
}

for (const folder of packs) {
  archive.directory(folder)
}

archive.finalize()
