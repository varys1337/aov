import { AoVActorSheet } from './base-actor-sheet.mjs'
import { AOVSelectLists } from '../../apps/select-lists.mjs'

export class AoVFarmSheet extends AoVActorSheet {
  /**
   *
   * @param options
   */
  constructor (options = {}) {
    super(options)
  }

  static DEFAULT_OPTIONS = {
    classes: ['farm'],
    position: {
      width: 610,
      height: 570
    }
  }

  static PARTS = {
    header: { template: 'systems/aov/templates/actor/farm.header.hbs' },
    tabs: { template: 'systems/aov/templates/generic/tab-navigation.hbs' },
    details: { template: 'systems/aov/templates/actor/farm.detail.hbs' },
    location: { template: 'systems/aov/templates/actor/farm.location.hbs' },
    description: { template: 'systems/aov/templates/actor/farm.description.hbs' },
    thralls: { template: 'systems/aov/templates/actor/farm.thralls.hbs' },
    gmTab: { template: 'systems/aov/templates/actor/farm.gmtab.hbs' }
  }

  /**
   *
   * @param options
   */
  async _prepareContext (options) {
    let context = await super._prepareContext(options)
    context.tabs = this._getTabs(options.parts)
    context.farmTypeOptions = await AOVSelectLists.farmTypeOptions()
    context.farmTypeName = game.i18n.localize('AOV.Farm.'+context.system.farmType)
    context.farmCircOptions = await AOVSelectLists.farmCircOptions()
    context.farmCircName = game.i18n.localize('AOV.FarmCirc.'+context.system.status)
    await this._prepareItems(context)
    return context
  }

  //Handle Actor's Items
  /**
   *
   * @param context
   */
  _prepareItems (context) {
    const thralls = []

    for (let itm of this.document.items) {
      if (itm.type === 'thrall') {
        itm.system.genderLabel = itm.system.gender
        if (context.isSelectGender) {
          itm.system.genderLabel = game.i18n.localize('AOV.'+itm.system.gender)
        }
        thralls.push(itm)
      }
    }
    context.thralls = thralls.sort(function (a, b) {return a.name.localeCompare(b.name)})
  }


  /** @override */
  async _preparePartContext (partId, context) {
    switch (partId) {
      case 'details':
      case 'location':
      case 'thralls':
        context.tab = context.tabs[partId]
        break
      case 'description':
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
      case 'gmTab':
        context.tab = context.tabs[partId]
        context.enrichedGMNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          this.actor.system.gmNotes,
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
        case 'location':
          tab.id = 'location'
          tab.label += 'Tabs.location'
          break
        case 'thralls':
          tab.id = 'thralls'
          tab.label += 'Tabs.thralls'
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
    options.parts = ['header', 'tabs', 'details', 'thralls', 'location', 'description']
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
    this.element.querySelectorAll('.gridLoc').forEach(n => n.addEventListener('dblclick', this.editLoc.bind(this)))
  }


  //-----------------------ACTIONS-----------------------------------

  //-----------------------LISTENERS-----------------------------------
  //Handle Actor Toggles
  /**
   *
   * @param event
   */
  async editLoc (event) {
    event.preventDefault()
    event.stopImmediatePropagation()
    const newLoc = Number(event.target.dataset.value)
    let valid = false
    if (newLoc >=80 && newLoc <= 83) {valid = true}
    else if (newLoc >=117 && newLoc <= 120) {valid = true}
    else if (newLoc >=153 && newLoc <= 158) {valid = true}
    else if (newLoc >=190 && newLoc <= 197) {valid = true}
    else if (newLoc >=227 && newLoc <= 236) {valid = true}
    else if (newLoc >=239 && newLoc <= 240) {valid = true}
    else if (newLoc >=242 && newLoc <= 243) {valid = true}
    else if (newLoc >=263 && newLoc <= 273) {valid = true}
    else if (newLoc >=276 && newLoc <= 281) {valid = true}
    else if (newLoc ===283) {valid = true}
    else if (newLoc >=300 && newLoc <= 310) {valid = true}
    else if (newLoc >=312 && newLoc <= 318) {valid = true}
    else if (newLoc >=320 && newLoc <= 322) {valid = true}
    else if (newLoc ===325) {valid = true}
    else if (newLoc >=337 && newLoc <= 363) {valid = true}
    else if (newLoc >=365 && newLoc <= 368) {valid = true}
    else if (newLoc >=377 && newLoc <= 404) {valid = true}
    else if (newLoc >=416 && newLoc <= 440) {valid = true}
    else if (newLoc >=454 && newLoc <= 476) {valid = true}
    else if (newLoc >=487 && newLoc <= 514) {valid = true}
    else if (newLoc >=524 && newLoc <= 551) {valid = true}
    else if (newLoc >=564 && newLoc <= 588) {valid = true}
    else if (newLoc >=605 && newLoc <= 625) {valid = true}
    else if (newLoc >=640 && newLoc <= 661) {valid = true}
    else if (newLoc >=676 && newLoc <= 683) {valid = true}
    else if (newLoc >=685 && newLoc <= 699) {valid = true}
    else if (newLoc >=714 && newLoc <= 718) {valid = true}
    else if (newLoc >=723 && newLoc <= 735) {valid = true}
    else if (newLoc >=761 && newLoc <= 768) {valid = true}
    else if (newLoc ===772) {valid = true}
    else if (newLoc >=800 && newLoc <= 802) {valid = true}

    if(valid) {
      await this.actor.update({ 'system.location': newLoc })
    }
  }


}
