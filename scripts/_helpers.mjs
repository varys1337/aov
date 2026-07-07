import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import readline from 'node:readline'
import { compilePack, extractPack } from '@foundryvtt/foundryvtt-cli'

export class Compendiums {
  static buildName = 'PackAgeOfVikings'
  static sourcePath = './packs/_source'

  static async pick () {
    const system = JSON.parse(fs.readFileSync('./system.json', { encoding: 'utf8' }))

    const grouped = system.packs.map(pack => { return { name: pack.name.toString(), type: pack.type } }).sort((a, b) => {
      if (a.type.toLowerCase() === b.type.toLowerCase()) {
        return a.name.localeCompare(b.name)
      }
      return a.type.localeCompare(b.type)
    })
    const selection = await new Promise(resolve => {
      const values = ['all'].concat(system.packs.map(pack => pack.name.toString().toLowerCase()).sort())
      const options = {
        input: process.stdin,
        output: process.stdout
      }
      options.completer = (line) => {
        const lcl = line.toString().toLowerCase()
        const found = values.filter(name => name.indexOf(lcl) === 0)
        return [found, line]
      }
      console.log('')
      console.log('all')
      let lastGroup = ''
      for (const group of grouped) {
        if (group.type !== lastGroup) {
          lastGroup = group.type
          console.log('\x1b[1;34m' + lastGroup + '\x1b[0m')
        }
        console.log('  ' + group.name)
      }

      const rl = readline.createInterface(options)
      rl.question('\x1b[1;34mSelect pack (tab to auto complete)\x1b[0m ', (answer) => {
        const text = answer.trim().toLowerCase()
        if (values.includes(text)) {
          resolve(text)
        } else {
          resolve(false)
        }
        rl.close()
      })
    })
    if (selection === false) {
      console.log('\x1b[1;31mExiting, no option selected\x1b[0m')
      process.exit()
    }

    const packs = system.packs.filter(pack => selection === 'all' || pack.name === selection)

    if (packs.length === 0) {
      console.log('\x1b[1;31mInvalid pack: ' + selection + '\x1b[0m')
      process.exit()
    }

    return packs
  }

  static standardisePath (input) {
    return input.replace(/[\[\]#%&}{><\*\?\s\b\0$!':@|‘`“"\+^\\\/-]+/g, '-').toLowerCase()
  }

  static sortByKey (entry) {
    if (entry === null) {
      return null
    }
    return Object.keys(entry).sort().reduce((carry, key) => {
      if (typeof entry[key] === 'object') {
        carry[key] = Compendiums.sortByKey(entry[key])
      } else {
        carry[key] = entry[key]
      }
      return carry
    }, {})
  }

  /**
   * Order the keys so diff is easier to understand
   * @param {object} entry
   * @param {object} options
   * @param {bool} options.clearSourceId
   * @param {integer} options.ownership
   */
  static cleanDocument (entry, { clearSourceId = true, ownership = 0 } = {}) {
    // Top level keys orders then order alphabetically
    const topLevelOrder = ['_key', '_id', 'name', 'type', 'folder', 'img']
    const ordered = Object.keys(entry).sort((a, b) => {
      const ao = topLevelOrder.indexOf(a)
      const bo = topLevelOrder.indexOf(b)
      if (ao === -1 && bo > -1) {
        return 1
      } else if (ao > -1 && bo === -1) {
        return -1
      } else if (ao === -1 && bo === -1) {
        return a.localeCompare(b)
      }
      return (ao < bo ? -1 : 1)
    }).reduce((carry, key) => {
      carry[key] = entry[key]
      return carry
    }, {})
    // Remove world users and set default ownership
    if (typeof ordered.ownership !== 'undefined') {
      ordered.ownership = { default: ownership }
    }
    // Clear source
    if (clearSourceId) {
      delete ordered._stats?.compendiumSource
    }
    // Set last modified by to this
    if (typeof ordered._stats?.lastModifiedBy !== 'undefined') {
      ordered._stats.lastModifiedBy = Compendiums.buildName
    }
    // Alter entry object
    for (const key in entry) {
      delete entry[key]
    }
    for (const key in ordered) {
      if (['effects', 'items'].includes(key)) {
        entry[key] = []
        for (const doc of ordered[key]) {
          Compendiums.cleanDocument(doc, { clearSourceId: false })
          entry[key].push(doc)
        }
      } else if (key === 'pages') {
        entry[key] = []
        for (const doc of ordered[key]) {
          Compendiums.cleanDocument(doc, { ownership: -1 })
          entry[key].push(doc)
        }
      } else if (typeof ordered[key] === 'object') {
        entry[key] = Compendiums.sortByKey(ordered[key])
      } else {
        entry[key] = ordered[key]
      }
    }
  }

  static async pack () {
    console.log('\x1b[1;4;35mBuild Compendiums\x1b[0m')
    const packs = await Compendiums.pick()
    for (const pack of packs) {
      const source = path.join(Compendiums.sourcePath, pack.name)
      const destination = path.join('./packs', pack.name)
      await compilePack(source, destination, {
        log: true,
        recursive: true,
        transformEntry: (entry, context) => {
          if (typeof entry.categories !== 'undefined' && JSON.stringify(entry.categories) === '{}') {
            delete entry.categories
          }
        },
        yaml: true
      })
    }
  }

  static async unpack () {
    console.log('\x1b[1;4;35mExport Compendiums\x1b[0m')
    const packs = await Compendiums.pick()

    for (const pack of packs) {
      const folders = {}
      const documents = {}
      const destination = path.join(Compendiums.sourcePath, pack.name)
      await extractPack(pack.path, destination, {
        folders: false,
        omitVolatile: true,
        transformEntry: (entry, context) => {
          const filename = Compendiums.standardisePath(entry.name)
          if (entry._key.startsWith('!folders!')) {
            if (typeof folders[filename] !== 'undefined') {
              throw new Error('Folder name: ' + filename + ' is repeated in pack ' + pack.name)
            }
            folders[filename] = true
          } else {
            if (typeof documents[filename] !== 'undefined') {
              throw new Error('Documents name: ' + filename + ' is repeated in pack ' + pack.name)
            }
            documents[filename] = true
          }
          Compendiums.cleanDocument(entry)
          return true
        },
        transformName: (entry, context) => {
          const filename = Compendiums.standardisePath(entry.name) + '.yaml'
          if (entry._key.startsWith('!folders!')) {
            return path.join('folders', filename)
          }
          return filename
        },
        yaml: true
      })
      console.log('\x1b[1;32mExported ' + pack.type + ': ' + pack.label + '\x1b[0m')
    }
  }
}
