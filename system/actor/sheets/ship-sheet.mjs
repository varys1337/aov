import { AOVSelectLists } from '../../apps/select-lists.mjs'
import { AoVActorSheet } from './base-actor-sheet.mjs'

export class AoVShipSheet extends AoVActorSheet {
  /**
   *
   * @param options
   */
  constructor (options = {}) {
    super(options)
  }

  static DEFAULT_OPTIONS = {
    classes: ['ship'],
    position: {
      width: 700,
      height: 950
    }
  }

  static PARTS = {
    header: { template: 'systems/aov/templates/actor/ship.header.hbs' },
    tabs: { template: 'systems/aov/templates/generic/tab-navigation.hbs' },
    speeds: { template: 'systems/aov/templates/actor/ship.speeds.hbs' },
    log: { template: 'systems/aov/templates/actor/ship.log.hbs' }
  }

  /**
   *
   * @param options
   */
  _configureRenderOptions (options) {
    super._configureRenderOptions(options)
    //Common parts to the character - this is the order they are show on the sheet
    options.parts = ['header', 'tabs', 'log', 'speeds']
  }

  /**
   *
   * @param parts
   */
  _getTabs (parts) {
    // If you have sub-tabs this is necessary to change
    const tabGroup = 'primary'
    // Default tab for first time it's rendered this session
    if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = 'log'
    let singleColour = game.settings.get('aov', 'singleColourBar')
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: '',
        group: tabGroup,
        id: '',
        icon: '',
        label: 'AOV.Tabs.'
      }
      switch (partId) {
        case 'header':
        case 'tabs':
          return tabs
        case 'speeds':
          tab.id = 'speeds'
          tab.label += 'speeds'
          break
        case 'log':
          tab.id = 'log'
          tab.label += 'log'
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
  async _prepareContext (options) {
    let context = await super._prepareContext(options)
    context.tabs = this._getTabs(options.parts)
    context.hullTypes = await AOVSelectLists.hullTypes()
    context.hullName = game.i18n.localize('AOV.ship.' + context.system.hull.type)
    context.windTypes = await AOVSelectLists.windTypes()
    context.before = context.system.sail[context.system.wind].before
    context.quarter = context.system.sail[context.system.wind].quarter
    context.half = context.system.sail[context.system.wind].half
    context.head = context.system.sail[context.system.wind].head
    await this._prepareItems(context)
    return context
  }

  /** @override */
  async _preparePartContext (partId, context) {
    switch (partId) {
      case 'speeds':
        context.tab = context.tabs[partId]
        break
      case 'log':
        context.tab = context.tabs[partId]
        context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          this.actor.system.description,
          {
            async: true,
            secrets: this.document.isOwner,
            rollData: this.actor.getRollData(),
            relativeTo: this.actor
          }
        )
        break
    }
    return context
  }

  //Handle Actor's Items
  /**
   *
   * @param context
   */
  async _prepareItems (context) {
  }



  //Activate event listeners using the prepared sheet HTML
  /**
   *
   * @param context
   * @param _options
   */
  _onRender (context, _options) {
    this._dragDrop.forEach((d) => d.bind(this.element))
  }



  //--------------ACTIONS-------------------



  //--------------LISTENERS------------------
  //Handle Actor Toggles
}
