//CHAOSIUM ID EDITOR
import { AOV } from '../setup/config.mjs'
import { AOVUtilities } from '../apps/utilities.mjs'
import { renderCIDDocumentSheet } from './cid-button.mjs'
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class CIDEditor extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    tag: 'form',
    name: 'cidEditor',
    classes: ['aov', 'dialog', 'cid-editor'],
    form: {
      handler: CIDEditor._updateObject,
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true
    },
    position: {
      width: 900,
      height: 'auto'
    },
    actions: {
      copyToClip: CIDEditor.copyToClip,
      guess: CIDEditor.guessID
    },



    window: {
      title: 'AOV.CIDFlag.title',
      contentClasses: ['standard-form']
    }
  }

  /**
   *
   */
  get title () {
    return `${game.i18n.localize(this.options.window.title)}`
  }

  static PARTS = {
    form: { template: 'systems/aov/templates/cid/cid-editor.hbs' }
  }

  /**
   *
   * @param options
   */
  async _prepareContext (options) {

    this.document = this.options.document
    const sheetData = await super._prepareContext(options)
    sheetData.objtype = this.document.type
    sheetData.objid = this.document.id
    sheetData.objuuid = this.document.uuid
    sheetData.supportedLanguages = CONFIG.supportedLanguages
    sheetData.isEditable = this.document.sheet.isEditable
    sheetData.guessCode = game.aov.cid.guessId(this.document)
    sheetData.idPrefix = game.aov.cid.getPrefix(this.document)
    sheetData.cidFlag = this.document.flags?.aov?.cidFlag
    sheetData.id = sheetData.cidFlag?.id || ''
    sheetData.lang = sheetData.cidFlag?.lang || game.i18n.lang
    sheetData.priority = sheetData.cidFlag?.priority || 0

    const CIDKeys = foundry.utils.flattenObject(game.i18n.translations.AOV.CIDFlag.keys ?? {})
    const prefix = new RegExp('^' + AOVUtilities.quoteRegExp(sheetData.idPrefix))
    sheetData.existingKeys = Object.keys(CIDKeys).reduce((obj, k) => {
      if (k.match(prefix)) {
        obj.push({ k, name: CIDKeys[k] })
      }
      return obj
    }, []).sort(AOVUtilities.sortByNameKey)
    sheetData.isSystemID = (typeof CIDKeys[sheetData.id] !== 'undefined')
    const match = sheetData.id.match(/^([^\\.]+)\.([^\\.]*)\.(.+)/)
    sheetData._existing = (match && typeof match[3] !== 'undefined' ? match[3] : '')

    if (sheetData.id && sheetData.lang) {
      // Find out if there exists a duplicate CID
      const worldDocuments = await game.aov.cid.fromCIDAll({
        cid: sheetData.id,
        lang: sheetData.lang,
        scope: 'world'
      })
      const uniqueWorldPriority = {}
      sheetData.worldDocumentInfo = await Promise.all(worldDocuments.map(async (d) => {
        return {
          priority: d.flags.aov.cidFlag.priority,
          lang: d.flags.aov.cidFlag.lang ?? 'en',
          link: await foundry.applications.ux.TextEditor.implementation.enrichHTML(d.link, { async: true }),
          folder: d?.folder?.name
        }
      }))
      const uniqueWorldPriorityCount = new Set(worldDocuments.map((d) => d.flags.aov.cidFlag.priority)).size
      if (uniqueWorldPriorityCount !== worldDocuments.length) {
        sheetData.warnDuplicateWorldPriority = true
      }
      sheetData.worldDuplicates = worldDocuments.length ?? 0

      const compendiumDocuments = await game.aov.cid.fromCIDAll({
        cid: sheetData.id,
        lang: sheetData.lang,
        scope: 'compendiums'
      })
      const uniqueCompendiumPriority = {}
      sheetData.compendiumDocumentInfo = await Promise.all(compendiumDocuments.map(async (d) => {
        return {
          priority: d.flags.aov.cidFlag.priority,
          lang: d.flags.aov.cidFlag.lang ?? 'en',
          link: await foundry.applications.ux.TextEditor.implementation.enrichHTML(d.link, { async: true }),
          folder: d?.folder?.name ?? ''
        }
      }))

      const uniqueCompendiumPriorityCount = new Set(compendiumDocuments.map((d) => d.flags.aov.cidFlag.priority)).size
      if (uniqueCompendiumPriorityCount !== compendiumDocuments.length) {
        sheetData.warnDuplicateCompendiumPriority = true
      }
      sheetData.compendiumDuplicates = compendiumDocuments.length ?? 0
    } else {
      sheetData.compendiumDocumentInfo = []
      sheetData.worldDocumentInfo = []
      sheetData.worldDuplicates = 0
      sheetData.compendiumDuplicates = 0
      sheetData.warnDuplicateWorldPriority = false
      sheetData.warnDuplicateCompendiumPriority = false
    }
    return sheetData
  }

  /**
   *
   * @param context
   * @param options
   */
  async _onRender (context, options) {
    await super._onRender(context, options)

    const existing = this.element.querySelector('input[name="_existing"]')
    if (existing && existing.dataset.aovBound !== 'true') {
      existing.dataset.aovBound = 'true'
      existing.addEventListener('change', event => {
        const prefix = event.currentTarget.dataset.prefix ?? ''
        let value = event.currentTarget.value
        if (value !== '') {
          value = prefix + AOVUtilities.toKebabCase(value)
        }
        let target = this.element.querySelector('input[name="id"]')
        if (!target) return
        target.value = value
      })
    }


    const known = this.element.querySelector('select[name="known"]')
    if (known && known.dataset.aovBound !== 'true') {
      known.dataset.aovBound = 'true'
      known.addEventListener('change', event => {
        let value = event.currentTarget.value
        let target = this.element.querySelector('input[name="id"]')
        if (!target) return
        target.value = value
      })
    }

  }

  /**
   *
   * @param event
   * @param target
   */
  static async copyToClip (event, target) {
    await AOVUtilities.copyToClipboard(target.parentElement?.querySelector('input')?.value ?? '')
  }

  /**
   *
   * @param event
   * @param target
   */
  static async guessID (event, target) {
    const guess = target.dataset.guess
    const priority = this.document.flags.aov?.cidFlag?.priority ?? 0
    const lang = this.document.flags.aov?.cidFlag?.lang ?? game.i18n.lang

    await this.document.update({
      'flags.aov.cidFlag.id': guess,
      'flags.aov.cidFlag.lang': lang,
      'flags.aov.cidFlag.priority': priority
    })
    await renderCIDDocumentSheet(this.document)
    this.render()
  }

  /**
   *
   * @param event
   * @param form
   * @param formData
   */
  static async _updateObject (event, form, formData) {
    const usage = foundry.utils.expandObject(formData.object)
    const id = usage.id || ''
    const priority = usage.priority || 0
    const lang = usage.lang || game.i18n.lang
    await this.document.update({
      'flags.aov.cidFlag.id': id,
      'flags.aov.cidFlag.lang': lang,
      'flags.aov.cidFlag.priority': priority
    })
    await renderCIDDocumentSheet(this.document)
    this.render()
  }

}
