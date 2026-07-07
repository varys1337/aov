//CHAOSIUM ID (CID)
import { AOVUtilities } from '../apps/utilities.mjs'

export class CID {
  /**
   *
   */
  static init () {
    CONFIG.Actor.compendiumIndexFields.push('flags.aov.cidFlag')
    // CONFIG.Cards.compendiumIndexFields.push('flags.aov.cidFlag')
    CONFIG.Item.compendiumIndexFields.push('flags.aov.cidFlag')
    CONFIG.JournalEntry.compendiumIndexFields.push('flags.aov.cidFlag')
    // CONFIG.Macro.compendiumIndexFields.push('flags.aov.cidFlag')
    // CONFIG.Playlist.compendiumIndexFields.push('flags.aov.cidFlag')
    CONFIG.RollTable.compendiumIndexFields.push('flags.aov.cidFlag')
    // CONFIG.Scene.compendiumIndexFields.push('flags.aov.cidFlag')
    game.aov.cid = CID
  }

  /**
   *
   */
  static #newProgressBar () {
    /* // FoundryVTT V12 */
    if (foundry.utils.isNewerVersion(game.version, '13')) {
      return ui.notifications.notify('SETUP.PackagesLoading', null, { localize: true, progress: true })
    }
    SceneNavigation.displayProgressBar({ label: game.i18n.localize('SETUP.PackagesLoading'), pct: 0 })
    return true
  }

  /**
   *
   * @param bar
   * @param current
   * @param max
   */
  static #setProgressBar (bar, current, max) {
    /* // FoundryVTT V12 */
    if (bar === true) {
      SceneNavigation.displayProgressBar({ label: game.i18n.localize('SETUP.PackagesLoading'), pct: Math.floor(current * 100 / max) })
    } else if (bar !== false) {
      bar.update({ pct: current / max })
    }
  }

  /**
   * Returns RegExp for valid type and format
   * @returns RegExp
   */
  static regExKey () {
    return new RegExp('^(' + Object.keys(CID.gamePropertyLookup).join('|') + ')\\.(.*?)\\.(.+)$')
  }

  /**
   * Get CID type.subtype. based on document
   * @param document
   * @returns string
   */
  static getPrefix (document) {
    for (const type in CID.documentNameLookup) {
      if (document instanceof CID.documentNameLookup[type]) {
        return type + '.' + (document.type ?? '') + '.'
      }
    }
    return ''
  }

  /**
   * Get CID type.subtype.name based on document
   * @param document
   * @returns string
   */
  static guessId (document) {
    return CID.getPrefix(document) + AOVUtilities.toKebabCase(document.name)
  }

  /**
   * Get CID type.subtype.partial-name(-removed)
   * @param key
   * @param id
   * @returns string
   */
  static guessGroupFromKey (id) {
    if (id) {
      const key = id.replace(/([^\\.-]+)$/, '')
      if (key.substr(-1) === '-') {
        return key
      }
    }
    return ''
  }

  /**
   * Get CID type.subtype.partial-name(-removed)
   * @param document
   * @returns string
   */
  static guessGroupFromDocument (document) {
    return CID.guessGroupFromKey(document.flags?.aov?.cidFlag?.id)
  }

  /**
   * Returns all items with matching CIDs and language
   * ui.notifications.warn for missing keys
   * @param itemList array of CIDs
   * @param itemList.itemList
   * @param lang the language to match against ('en', 'es', ...)
   * @param itemList.lang
   * @param langFallback should the system fall back to en incase there is no translation
   * @param itemList.langFallback
   * @param showLoading Show loading bar
   * @param itemList.showLoading
   * @returns array
   */
  static async expandItemArray ({ itemList, lang = game.i18n.lang, langFallback = true, showLoading = false } = {}) {
    let items = []
    const cids = itemList.filter(it => typeof it === 'string')
    items = itemList.filter(it => typeof it !== 'string')

    if (cids.length) {
      const found = await CID.fromCIDRegexBest({ cidRegExp: CID.makeGroupRegEx(cids), type: 'i', lang, langFallback, showLoading })
      const all = []
      for (const cid of cids) {
        const item = found.find(i => i.flags.aov.cidFlag.id === cid)
        if (item) {
          all.push(item)
        }
      }
      if (all.length < cids.length) {
        const notmissing = []
        for (const doc of all) {
          notmissing.push(doc.flags.aov.cidFlag.id)
        }
        ui.notifications.warn(game.i18n.format('AOV.CIDFlag.error.documents-not-found', { cids: cids.filter(x => !notmissing.includes(x)).join(', '), lang }))
      }
      items = items.concat(all)
    }
    return items
  }

  /**
   * Returns item with matching CIDs from list
   * Empty array return for missing keys
   * @param cid a single cid
   * @param list array of items
   * @returns array
   */
  static findCIdInList (cid, list) {
    let itemName = ''
    const CIDKeys = Object.assign(foundry.utils.flattenObject(game.i18n._fallback.AOV?.CIDFlag?.keys ?? {}), foundry.utils.flattenObject(game.i18n.translations.AOV?.CIDFlag?.keys ?? {}))
    if (typeof CIDKeys[cid] !== 'undefined') {
      itemName = CIDKeys[cid]
    }
    return (typeof list.filter === 'undefined' ? Object.values(list) : list).filter(i => i.flags?.aov?.cidFlag?.id === cid || (itemName !== '' && itemName === i.name))
  }

  /**
   * Returns RegExp matching all strings in array
   * @param cids an array of CID strings
   * @param list array of items
   * @returns RegExp
   */
  static makeGroupRegEx (cids) {
    if (typeof cids === 'string') {
      cids = [cids]
    } else if (typeof cids === 'undefined' || typeof cids.filter !== 'function') {
      return undefined
    }
    const splits = {}
    const rgx = CID.regExKey()
    for (const i of cids) {
      const key = i.match(rgx)
      if (key) {
        if (typeof splits[key[1]] === 'undefined') {
          splits[key[1]] = {}
        }
        if (typeof splits[key[1]][key[2]] === 'undefined') {
          splits[key[1]][key[2]] = []
        }
        splits[key[1]][key[2]].push(key[3])
      } else {
        // Sliently error
      }
    }
    const regExParts = []
    for (const t in splits) {
      const row = []
      for (const s in splits[t]) {
        if (splits[t][s].length > 1) {
          row.push(s + '\\.' + '(' + splits[t][s].join('|') + ')')
        } else {
          row.push(s + '\\.' + splits[t][s].join(''))
        }
      }
      if (row.length > 1) {
        regExParts.push(t + '\\.' + '(' + row.join('|') + ')')
      } else {
        regExParts.push(t + '\\.' + row.join(''))
      }
    }
    if (regExParts.length > 1) {
      return new RegExp('^(' + regExParts.join('|') + ')$')
    }
    return new RegExp('^' + regExParts.join('') + '$')
  }

  /**
   * Returns all documents with an CID matching the regex and matching the document type and language.
   * Empty array return for no matches
   * @param cidRegExp regex used on the CID
   * @param cidRegExp.cidRegExp
   * @param type the first part of the wanted CID, for example 'i', 'a', 'je'
   * @param cidRegExp.type
   * @param lang the language to match against ('en', 'es', ...)
   * @param cidRegExp.lang
   * @param langFallback should the system fall back to en incase there is no translation
   * @param cidRegExp.langFallback
   * @param scope defines where it will look:
   * **all**: find in both world & compendia,
   * **world**: only search in world,
   * **compendiums**: only search in compendiums
   * @param cidRegExp.scope
   * @param showLoading Show loading bar
   * @param cidRegExp.showLoading
   * @returns array
   */
  static async fromCIDRegexAll ({ cidRegExp, type, lang = game.i18n.lang, langFallback = true, scope = 'all', showLoading = false } = {}) {
    let progressBar = false
    let progressCurrent = 0
    let progressMax = (1 + game.packs.size) * 2 // Guess at how far bar goes
    if (showLoading) {
      progressBar = CID.#newProgressBar()
    }
    let candidates = await CID.#getDataFromScopes({ cidRegExp, type, lang, langFallback, progressBar, progressCurrent, progressMax, scope })
    if (langFallback && lang !== 'en') {
      candidates = CID.#filterByLanguage(candidates, lang)
    }
    candidates.sort(CID.compareCIDPrio)
    const results = await CID.#onlyDocuments(candidates, progressBar, progressCurrent, progressMax)
    CID.#setProgressBar(progressBar, 1, 1)
    return results
  }

  /**
   * Returns all documents with a CID and language.
   * Empty array return for no matches
   * @param cid a single cid
   * @param cid.cid
   * @param lang the language to match against ('en', 'es', ...)
   * @param cid.lang
   * @param langFallback should the system fall back to en incase there is no translation
   * @param cid.langFallback
   * @param scope defines where it will look:
   * **all**: find in both world & compendia,
   * **world**: only search in world,
   * **compendiums**: only search in compendiums
   * @param cid.scope
   * @param showLoading Show loading bar
   * @param cid.showLoading
   * @returns array
   */
  static async fromCIDAll ({ cid, lang = game.i18n.lang, langFallback = true, scope = 'all', showLoading = false } = {}) {
    if (!cid || typeof cid !== 'string') {
      return []
    }
    const parts = cid.match(CID.regExKey())
    if (!parts) {
      return []
    }
    if (lang === '') {
      lang = game.i18n.lang
    }
    return CID.fromCIDRegexAll({ cidRegExp: new RegExp('^' + AOVUtilities.quoteRegExp(cid) + '$'), type: parts[1], lang, langFallback, scope, showLoading })
  }

  /**
   * Gets only the highest priority documents for each CID that matches the RegExp and language
   * Empty array return for no matches
   * @param cidRegExp regex used on the CID
   * @param cidRegExp.cidRegExp
   * @param type the first part of the wanted CID, for example 'i', 'a', 'je'
   * @param cidRegExp.type
   * @param lang the language to match against ("en", "es", ...)
   * @param cidRegExp.lang
   * @param langFallback should the system fall back to en incase there is no translation
   * @param cidRegExp.langFallback
   * @param showLoading Show loading bar
   * @param cidRegExp.showLoading
   */
  static async fromCIDRegexBest ({ cidRegExp, type, lang = game.i18n.lang, langFallback = true, showLoading = false } = {}) {
    let progressBar = false
    let progressCurrent = 0
    let progressMax = (1 + game.packs.size) * 2 // Guess at how far bar goes
    if (showLoading) {
      progressBar = CID.#newProgressBar()
    }
    let candidates = await this.#getDataFromScopes({ cidRegExp, type, lang, langFallback, progressBar, progressCurrent, progressMax })
    if (langFallback && lang !== 'en') {
      candidates = CID.#filterByLanguage(candidates, lang)
    }
    candidates.sort(CID.#compareCIDPrio)
    const ids = {}
    for (const candidate of candidates) {
      if (!Object.prototype.hasOwnProperty.call(ids, candidate.flags.aov.cidFlag.id)) {
        ids[candidate.flags.aov.cidFlag.id] = candidate
      }
    }
    const candidateIds = Object.values(ids)
    progressCurrent = candidateIds.length
    progressMax = progressCurrent * 2 // readjust max to give to leave progress at 50%
    const results = await CID.#onlyDocuments(candidateIds, progressBar, progressCurrent, progressMax)
    CID.#setProgressBar(progressBar, 1, 1)
    return results
  }

  /**
   * Gets only the highest priority document for CID that matches the language,
   * with the highest priority documents in the World taking precedence over
   * any documents
   * in compendium packs.
   * @param cid string CID
   * @param lang the language to match against ("en", "es", ...)
   * @param langFallback should the system fall back to en incase there is no translation
   */
  static fromCID (cid, lang = game.i18n.lang, langFallback = true) {
    return CID.fromCIDBest({ cid, lang, langFallback })
  }

  /**
   * Gets only the highest priority document for CID that matches the language
   * @param cid string CID
   * @param cid.cid
   * @param lang the language to match against ("en", "es", ...)
   * @param cid.lang
   * @param langFallback should the system fall back to en incase there is no translation
   * @param cid.langFallback
   * @param showLoading Show loading bar
   * @param cid.showLoading
   */
  static fromCIDBest ({ cid, lang = game.i18n.lang, langFallback = true, showLoading = false } = {}) {
    if (!cid || typeof cid !== 'string') {
      return []
    }
    const type = cid.split('.')[0]
    const cidRegExp = new RegExp('^' + AOVUtilities.quoteRegExp(cid) + '$')
    return CID.fromCIDRegexBest({ cidRegExp, type, lang, langFallback, showLoading })
  }

  /**
   * Returns all documents or indexes with an CID matching the regex and matching the document type and language.
   * Empty array return for no matches
   * @param cidRegExp regex used on the CID
   * @param cidRegExp.cidRegExp
   * @param type the first part of the wanted CID, for example 'i', 'a', 'je'
   * @param cidRegExp.type
   * @param lang the language to match against ('en', 'es', ...)
   * @param cidRegExp.lang
   * @param langFallback should the system fall back to en incase there is no translation
   * @param cidRegExp.langFallback
   * @param progressBar If true show v12 progress bar, if not false show v13 progress bar
   * @param cidRegExp.progressBar
   * @param progressCurrent Current Progress
   * @param cidRegExp.progressCurrent
   * @param progressMax Max Progress
   * @param cidRegExp.progressMax
   * @param scope defines where it will look:
   * **all**: find in both world & compendia,
   * **world**: only search in world,
   * **compendiums**: only search in compendiums
   * @param cidRegExp.scope
   * @returns array
   */
  static async #getDataFromScopes ({ cidRegExp, type, lang, langFallback, progressBar, progressCurrent, progressMax, scope = 'all' } = {}) {
    if (!cidRegExp) {
      return []
    }

    let results = []
    if (['all', 'world'].includes(scope)) {
      results = results.concat(await CID.#docsFromWorld({ cidRegExp, type, lang, langFallback, progressBar, progressCurrent: 0, progressMax }))
    }
    if (['all', 'compendiums'].includes(scope)) {
      results = results.concat(await CID.#indexesFromCompendia({ cidRegExp, type, lang, langFallback, progressBar, progressCurrent: 1, progressMax }))
    }

    return results
  }

  /**
   * Get a list of all documents matching the CID regex and language from the world.
   * The document list is sorted with the highest priority first.
   * @param cidRegExp regex used on the CID
   * @param cidRegExp.cidRegExp
   * @param type the first part of the wanted CID, for example 'i', 'a', 'je'
   * @param cidRegExp.type
   * @param lang the language to match against ('en', 'es', ...)
   * @param cidRegExp.lang
   * @param langFallback should the system fall back to en incase there is no translation
   * @param cidRegExp.langFallback
   * @param progressBar If true show v12 progress bar, if not false show v13 progress bar
   * @param cidRegExp.progressBar
   * @param progressCurrent Current Progress
   * @param cidRegExp.progressCurrent
   * @param progressMax Max Progress
   * @param cidRegExp.progressMax
   * @returns array
   */
  static async #docsFromWorld ({ cidRegExp, type, lang, langFallback, progressBar, progressCurrent, progressMax } = {}) {
    if (!cidRegExp) {
      return []
    }
    if (lang === '') {
      lang = game.i18n.lang
    }

    const gameProperty = CID.getGameProperty(`${type}..`)

    const candidateDocuments = game[gameProperty]?.filter((d) => {
      const cidFlag = d.getFlag('aov', 'cidFlag')
      if (typeof cidFlag === 'undefined') {
        return false
      }
      return cidRegExp.test(cidFlag.id) && [lang, (langFallback ? 'en' : '-')].includes(cidFlag.lang)
    })

    progressCurrent++
    CID.#setProgressBar(progressBar, progressCurrent, progressMax)

    if (candidateDocuments === undefined) {
      return []
    }

    return candidateDocuments
  }

  /**
   * Get a list of all indexes matching the CID regex and language from the compendiums.
   * @param cidRegExp regex used on the CID
   * @param cidRegExp.cidRegExp
   * @param type the first part of the wanted CID, for example 'i', 'a', 'je'
   * @param cidRegExp.type
   * @param lang the language to match against ('en', 'es', ...)
   * @param cidRegExp.lang
   * @param langFallback should the system fall back to en incase there is no translation
   * @param cidRegExp.langFallback
   * @param progressBar If true show v12 progress bar, if not false show v13 progress bar
   * @param cidRegExp.progressBar
   * @param progressCurrent Current Progress
   * @param cidRegExp.progressCurrent
   * @param progressMax Max Progress
   * @param cidRegExp.progressMax
   * @returns array
   */
  static async #indexesFromCompendia ({ cidRegExp, type, lang, langFallback, progressBar, progressCurrent, progressMax }) {
    if (!cidRegExp) {
      return []
    }
    if (lang === '') {
      lang = game.i18n.lang
    }

    const documentType = CID.getDocumentType(type).name
    let indexDocuments = []

    for (const pack of game.packs) {
      if (pack.documentName === documentType) {
        if (!pack.indexed) {
          await pack.getIndex()
        }
        indexDocuments = indexDocuments.concat(pack.index.filter((i) => {
          if (typeof i.flags?.aov?.cidFlag?.id !== 'string') {
            return false
          }
          return cidRegExp.test(i.flags.aov.cidFlag.id) && [lang, (langFallback ? 'en' : '-')].includes(i.flags.aov.cidFlag.lang)
        }))
      }
      progressCurrent++
      CID.#setProgressBar(progressBar, progressCurrent, progressMax)
    }
    return indexDocuments
  }

  /**
   * Sort a list of document on CID priority - the highest first.
   * @param a
   * @param b
   * @example
   * aListOfDocuments.sort(CID.compareCIDPrio)
   */
  static #compareCIDPrio (a, b) {
    const ap = parseInt(a.flags.aov.cidFlag.priority, 10)
    const bp = parseInt(b.flags.aov.cidFlag.priority, 10)
    if (ap === bp) {
      const ao = a instanceof foundry.abstract.DataModel
      const bo = b instanceof foundry.abstract.DataModel
      if (ao === bo) {
        return 0
      } else {
        return (ao ? -1 : 1)
      }
    }
    return bp - ap
  }

  /**
   * Translates the first part of a CID to what those documents are called in the `game` object.
   * @param cid a single cid
   */
  static getGameProperty (cid) {
    const type = cid.split('.')[0]
    const gameProperty = CID.gamePropertyLookup[type]
    if (!gameProperty) {
      ui.notifications.warn(game.i18n.format('AOV.CIDFlag.error.incorrect.type'))
      console.log('aov | ', cid)
      throw new Error()
    }
    return gameProperty
  }

  /**
   *
   */
  static get gamePropertyLookup () {
    return {
      a: 'actors',
      c: 'cards',
      i: 'items',
      je: 'journal',
      m: 'macros',
      p: 'playlists',
      rt: 'tables',
      s: 'scenes'
    }
  }

  /**
   * Translates the first part of a CID to what those documents are called in the `game` object.
   * @param cid a single cid
   */
  static getDocumentType (cid) {
    const type = cid.split('.')[0]
    const documentType = CID.documentNameLookup[type]
    if (!documentType) {
      ui.notifications.warn(game.i18n.format('AOV.CIDFlag.error.incorrect.type'))
      console.log('aov | ', cid)
      throw new Error()
    }
    return documentType
  }

  /**
   *
   */
  static get documentNameLookup () {
    return {
      a: Actor,
      c: Card,
      i: Item,
      je: JournalEntry,
      m: Macro,
      p: Playlist,
      rt: RollTable,
      s: Scene
    }
  }

  /**
   * Replace indexes with their documents
   * @param candidates
   * @param progressBar
   * @param progressCurrent
   * @param progressMax
   */
  static async #onlyDocuments (candidates, progressBar, progressCurrent, progressMax) {
    const len = candidates.length
    if (len > 0) {
      for (const offset in candidates) {
        if (!(candidates[offset] instanceof foundry.abstract.DataModel)) {
          candidates[offset] = await fromUuid(candidates[offset].uuid)
        }
        progressCurrent++
        CID.#setProgressBar(progressBar, progressCurrent, progressMax)
      }
    }
    return candidates
  }

  /**
   * Filter an array of index or documents.
   * If a CID has a version lang then remove the en versions
   * @param indexes
   * @param lang
   */
  static #filterByLanguage (indexes, lang) {
    const ids = indexes.reduce((c, i) => {
      c[i.flags.aov.cidFlag.id] = c[i.flags.aov.cidFlag.id] || i.flags.aov.cidFlag.lang === lang
      return c
    }, {})
    return indexes.filter(i => i.flags.aov.cidFlag.lang !== 'en' || !ids[i.flags.aov.cidFlag.id])
  }

}
