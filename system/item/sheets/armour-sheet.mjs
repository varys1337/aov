import { AoVItemSheet } from './base-item-sheet.mjs'
import { AOVSelectLists } from '../../apps/select-lists.mjs'
import { AOVActiveEffectSheet } from '../../sheets/aov-active-effect-sheet.mjs'
//
export class AoVArmourSheet extends AoVItemSheet {
  /**
   *
   * @param options
   */
  constructor (options = {}) {
    super(options)
  }

  static DEFAULT_OPTIONS = {
    classes: ['armour'],
    position: {
      width: 610,
      height: 520
    }
  }

  static PARTS = {
    header: { template: 'systems/aov/templates/item/item.header.hbs' },
    tabs: { template: 'systems/aov/templates/generic/tab-navigation.hbs' },
    details: { template: 'systems/aov/templates/item/armour.detail.hbs' },
    description: { template: 'systems/aov/templates/item/item.description.hbs' },
    effects: { template: 'systems/aov/templates/item/item.active-effect.hbs' },
    gmTab: { template: 'systems/aov/templates/item/item.gmtab.hbs' }
  }

  /**
   *
   * @param options
   */
  async _prepareContext (options) {
    let context = await super._prepareContext(options)
    context.equippedOptions = await AOVSelectLists.equippedOptions(this.document.type)
    context.tabs = this._getTabs(options.parts)
    context.effects = AOVActiveEffectSheet.getItemEffectsFromSheet(this.document)
    const changesActiveEffects = AOVActiveEffectSheet.getEffectChangesFromSheet(this.document)
    context.effectChanges = changesActiveEffects.effectChanges
    return context
  }

  /** @override */
  async _preparePartContext (partId, context) {
    switch (partId) {
      case 'details':
      case 'effects':
        context.tab = context.tabs[partId]
        break
      case 'description':
        context.tab = context.tabs[partId]
        context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          this.item.system.description,
          {
            secrets: this.document.isOwner,
            rollData: this.document.getRollData(),
            relativeTo: this.document
          }
        )
        break
      case 'gmTab':
        context.tab = context.tabs[partId]
        context.enrichedGMNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          this.item.system.gmNotes,
          {
            secrets: this.document.isOwner,
            rollData: this.document.getRollData(),
            relativeTo: this.document
          }
        )
        break
    }
    return context
  }

  /**
   *
   * @param parts
   */
  _getTabs (parts) {
    const tabGroup = 'primary'
    //Default tab
    if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = 'details'
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: '',
        group: tabGroup,
        id: '',
        icon: '',
        label: 'AOV.'
      }
      switch (partId) {
        case 'header':
        case 'tabs':
          return tabs
        case 'details':
          tab.id = 'details'
          tab.label += 'details'
          break
        case 'effects':
          tab.id = 'effects'
          tab.label += 'effects'
          break
        case 'description':
          tab.id = 'description'
          tab.label += 'description'
          break
        case 'gmTab':
          tab.id = 'gmTab'
          tab.label += 'gmTab'
          break
      }
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = 'active'
      tabs[partId] = tab
      return tabs
    }, {})
  }

  /**
   *
   * @param options
   */
  _configureRenderOptions (options) {
    super._configureRenderOptions(options)
    //Only show GM tab if you are GM
    options.parts = ['header', 'tabs', 'details', 'effects', 'description']
    if (game.user.isGM) {
      options.parts.push('gmTab')
    }
  }

  //Activate event listeners using the prepared sheet HTML
  /**
   *
   * @param context
   * @param _options
   */
  _onRender (context, _options) {
    this._dragDrop.forEach((d) => d.bind(this.element))
    AOVActiveEffectSheet.activateListeners(this)
  }


  //-----------------------ACTIONS-----------------------------------

}
