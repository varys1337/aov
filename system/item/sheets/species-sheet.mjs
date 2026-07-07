import { AoVItemSheet } from './base-item-sheet.mjs'
import { AOVUtilities } from '../../apps/utilities.mjs'

export class AoVSpeciesSheet extends AoVItemSheet {
  /**
   *
   * @param options
   */
  constructor (options = {}) {
    super(options)
    this.#dragDrop = this.#createDragDropHandlers()
  }

  static DEFAULT_OPTIONS = {
    classes: ['species'],
    dragDrop: [{ dragSelector: '[data-drag]', dropSelector: '.droppable' }],
    position: {
      height: 640
    }
  }

  static PARTS = {
    header: { template: 'systems/aov/templates/item/item.header.hbs' },
    tabs: { template: 'systems/aov/templates/generic/tab-navigation.hbs' },
    details: { template: 'systems/aov/templates/item/species.detail.hbs' },
    description: { template: 'systems/aov/templates/item/item.description.hbs' },
    gmTab: { template: 'systems/aov/templates/item/item.gmtab.hbs' }
  }

  /**
   *
   * @param options
   */
  async _prepareContext (options) {
    let context = await super._prepareContext(options)
    context.tabs = this._getTabs(options.parts)
    const hitLocs = []
    context.hasLocs = false
    for (let hitLoc of context.system.hitlocs) {
      context.hasLocs = true
      let tempLoc = (await game.aov.cid.fromCIDBest({ cid: hitLoc.cid }))[0]
      if (tempLoc) {
        hitLocs.push({ uuid: hitLoc.uuid, cid: hitLoc.cid, name: tempLoc.name, rank: hitLoc.rank })
      } else {
        hitLocs.push({ uuid: hitLoc.uuid, cid: hitLoc.cid, name: game.i18n.localize('AOV.invalid'), rank: hitLoc.rank })
      }
    }

    hitLocs.sort(function (a, b) {
      let x = a.rank
      let y = b.rank
      if (x < y) { return 1 };
      if (x > y) { return -1 };
      return 0
    })

    context.hitLocs = hitLocs
    return context
  }

  /** @override */
  async _preparePartContext (partId, context) {
    switch (partId) {
      case 'details':
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
    options.parts = ['header', 'tabs', 'details', 'description']
    if (game.user.isGM) {
      options.parts.push('gmTab')
    }
  }

  //Activate event listeners using the prepared sheet HTML
  /**
   *
   * @param context
   * @param options
   */
  _onRender (context, options) {
    this.#dragDrop.forEach((d) => d.bind(this.element))
    this.element.querySelectorAll('.item-delete').forEach(n => n.addEventListener('dblclick', this.#onItemDelete.bind(this)))
    this.element.querySelectorAll('.item-view').forEach(n => n.addEventListener('click', this.#onItemView.bind(this)))
  }

  //-----------------------ACTIONS-----------------------------------



  //Allow for a hitlocation being dragged and dropped on to the species sheet
  /**
   *
   * @param event
   * @param type
   * @param collectionName
   */
  async _onDrop (event, type = 'hitloc', collectionName = 'hitlocs') {
    event.preventDefault()
    event.stopPropagation()

    const optionalSkill = event?.currentTarget?.classList?.contains('optional-skills')
    const ol = event?.currentTarget?.closest('ol')
    const index = ol?.dataset?.group
    const dataList = await AOVUtilities.getDataFromDropEvent(event, 'Item')
    const collection = this.item.system[collectionName] ? foundry.utils.duplicate(this.item.system[collectionName]) : []
    const groups = this.item.system.groups ? foundry.utils.duplicate(this.item.system.groups) : []

    for (const item of dataList) {
      if (!item || !item.system) { continue }
      if (![type].includes(item.type)) { continue }

      //Dropping in Hit Locaiton list - check the item doesn't already exist
      if (collection.find(el => el.cid === item.flags.aov.cidFlag.id)) {
        ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.dupItem', { itemName: (item.name +'(' + item.flags.aov.cidFlag.id +')') }))
        continue
      }
      collection.push({ uuid: item.uuid, cid: item.flags.aov.cidFlag.id, rank: item.system.lowRoll })

    }
    await this.item.update({ [`system.${collectionName}`]: collection })
    return
  }

  //Delete's a hitloc in the main  list
  /**
   *
   * @param event
   * @param collectionName
   */
  async #onItemDelete (event, collectionName = 'hitlocs') {
    event.preventDefault()
    event.stopImmediatePropagation()
    const item = $(event.currentTarget).closest('.item')
    const itemId = item.data('item-id')
    const itemIndex = this.item.system[collectionName].findIndex(i => (itemId && i.uuid === itemId))
    if (itemIndex > -1) {
      const collection = this.item.system[collectionName] ? foundry.utils.duplicate(this.item.system[collectionName]) : []
      collection.splice(itemIndex, 1)
      await this.item.update({ [`system.${collectionName}`]: collection })
    }
  }


  //View a hitloc from the main list
  /**
   *
   * @param event
   */
  async #onItemView (event) {
    const item = $(event.currentTarget).closest('.item')
    const cid = item.data('cid')
    let tempItem = (await game.aov.cid.fromCIDBest({ cid: cid }))[0]
    if (tempItem) { tempItem.sheet.render(true) };
  }



  // DragDrop
  //
  //

  /**
   *
   * @param selector
   */
  _canDragStart (selector) {
    // game.user fetches the current user
    return this.isEditable
  }

  /**
   *
   * @param selector
   */
  _canDragDrop (selector) {
    // game.user fetches the current user
    return this.isEditable
  }


  /**
   *
   * @param event
   */
  _onDragStart (event) {
    const li = event.currentTarget
    if ('link' in event.target.dataset) return

    let dragData = null

    // Active Effect
    if (li.dataset.effectId) {
      const effect = this.item.effects.get(li.dataset.effectId)
      dragData = effect.toDragData()
    }

    if (!dragData) return

    // Set data transfer
    event.dataTransfer.setData('text/plain', JSON.stringify(dragData))
  }

  /**
   *
   * @param event
   */
  _onDragOver (event) {}



  /**
   *
   * @param event
   * @param data
   */
  async _onDropItem (event, data) {
    if (!this.item.isOwner) return false
  }

  /**
   *
   * @param event
   * @param data
   */
  async _onDropFolder (event, data) {
    if (!this.item.isOwner) return []
  }

  /**
   *
   */
  get dragDrop () {
    return this.#dragDrop
  }

  // This is marked as private because there's no real need
  // for subclasses or external hooks to mess with it directly
  #dragDrop

  /**
   *
   */
  #createDragDropHandlers () {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this)
      }
      d.callbacks = {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this)
      }
      return new foundry.applications.ux.DragDrop.implementation(d)
    })
  }

}
