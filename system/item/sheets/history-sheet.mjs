import { AoVItemSheet } from './base-item-sheet.mjs'
import { AOVUtilities } from '../../apps/utilities.mjs'
import { AOVCharCreate } from '../../actor/charCreate.mjs'

export class AoVHistorySheet extends AoVItemSheet {
  /**
   *
   * @param options
   */
  constructor (options = {}) {
    super(options)
    this.#dragDrop = this.#createDragDropHandlers()
  }

  static DEFAULT_OPTIONS = {
    classes: ['history'],
    dragDrop: [{ dragSelector: '[data-drag]', dropSelector: '.droppable' }],
    position: {
      height: 635
    }
  }

  static PARTS = {
    header: {
      template: 'systems/aov/templates/item/item.header.hbs'
    },
    tabs: { template: 'systems/aov/templates/generic/tab-navigation.hbs' },
    details: {
      template: 'systems/aov/templates/item/history.detail.hbs',
      scrollable: ['']
    },
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
    const skills = []
    context.hasSkills = false
    for (let skill of context.system.skills) {
      context.hasSkills = true
      let tempLoc = (await game.aov.cid.fromCIDBest({ cid: skill.cid }))[0]
      if (tempLoc) {
        skills.push({ uuid: skill.uuid, cid: skill.cid, name: tempLoc.name, bonus: skill.bonus })
      } else {
        skills.push({ uuid: skill.uuid, cid: skill.cid, name: game.i18n.localize('AOV.invalid'), bonus: skill.bonus })
      }
    }

    const passions = []
    context.hasPassions = false
    for (let passion of context.system.passions) {
      context.hasPassions = true
      if (passion.bonus === '') {
        passion.passionLabel = '60/+10%'
      } else {
        passion.passionLabel = passion.bonus + '%'
        if (Number(passion.bonus) >= 0) {
          passion.passionLabel = '+' + passion.passionLabel
        }
      }
      let tempLoc = (await game.aov.cid.fromCIDBest({ cid: passion.cid }))[0]
      if (tempLoc) {
        passions.push({ uuid: passion.uuid, cid: passion.cid, name: tempLoc.name, bonus: passion.passionLabel })
      } else {
        passions.push({ uuid: passion.uuid, cid: passion.cid, name: game.i18n.localize('AOV.invalid'), bonus: passion.passionLabel })
      }
    }

    const equipment = []
    context.hasEquip = false
    for (let equip of context.system.equipment) {
      context.hasEquip = true
      let tempLoc = (await game.aov.cid.fromCIDBest({ cid: equip.cid }))[0]
      if (tempLoc) {
        equipment.push({ uuid: equip.uuid, cid: equip.cid, name: tempLoc.name })
      } else {
        equipment.push({ uuid: equip.uuid, cid: equip.cid, name: game.i18n.localize('AOV.invalid') })
      }
    }

    const historyTables = []
    context.hasTables = false
    for (let histTable of context.system.historyToday) {
      context.hasTables = true
      let tempLoc = (await game.aov.cid.fromCIDBest({ cid: histTable.cid }))[0]
      if (tempLoc) {
        historyTables.push({ uuid: histTable.uuid, cid: histTable.cid, name: tempLoc.name, label: game.i18n.localize('AOV.' + histTable.historyType) })
      } else {
        historyTables.push({ uuid: histTable.uuid, cid: histTable.cid, name: game.i18n.localize('AOV.invalid'), label: game.i18n.localize('AOV.' + histTable.historyType) })
      }
    }

    context.skills = skills.sort(function (a, b) { return a.name.localeCompare(b.name) })
    context.passions = passions.sort(function (a, b) { return a.name.localeCompare(b.name) })
    context.equipment = equipment.sort(function (a, b) { return a.name.localeCompare(b.name) })
    context.historyTables = historyTables.sort(function (a, b) { return a.name.localeCompare(b.name) })
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



  //Allow for a skill being dragged and dropped on to the species sheet
  /**
   *
   * @param event
   * @param type
   * @param collectionName
   */
  async _onDrop (event, type = 'skill', collectionName = 'skills') {
    event.preventDefault()
    event.stopPropagation()
    let datalistType = 'Item'
    if (event?.currentTarget?.classList?.contains('passions')) {
      type = 'passion'
      collectionName = 'passions'
    } else if (event?.currentTarget?.classList?.contains('equipment')) {
      type = 'armour'
      collectionName = 'equipment'
    } else if (event?.currentTarget?.classList?.contains('historyToday')) {
      collectionName = 'historyToday'
      datalistType = 'RollTable'
    }

    const dataList = await AOVUtilities.getDataFromDropEvent(event, datalistType)
    const collection = this.item.system[collectionName] ? foundry.utils.duplicate(this.item.system[collectionName]) : []
    const groups = this.item.system.groups ? foundry.utils.duplicate(this.item.system.groups) : []

    for (const item of dataList) {
      if (collectionName === 'historyToday') {
        //This is ok - keep going
      } else if (!item || !item.system) {
        continue
      } else if (['weapon', 'armour', 'gear'].includes(item.type) && collectionName === 'equipment') {
        //allow us to proceed
      } else if (![type].includes(item.type)) { continue }

      let bonus = 0
      let historyType = ''
      if (['skills', 'passions'].includes(collectionName)) {
        bonus = await AOVCharCreate.inpText(game.i18n.localize('AOV.bonusPenalty'))
      } else if (['historyToday'].includes(collectionName)) {
        historyType = await AOVCharCreate.askHistory()
      }

      //Dropping in item list - check the item doesn't already exist
      if (collectionName === 'skills' && item.system.category === 'zzz') {
        //Exempt group skills from check
      } else if (collectionName === 'historyToday') {
        //Exempt Roll Table from check
      } else if (collection.find(el => el.cid === item.flags.aov.cidFlag.id)) {
        ui.notifications.warn(game.i18n.format('AOV.ErrorMsg.dupItem', { itemName: (item.name + '(' + item.flags.aov.cidFlag.id + ')') }))
        continue
      }
      collection.push({ uuid: item.uuid, cid: item.flags.aov.cidFlag.id, bonus: bonus.inpvalue, historyType: historyType })
    }
    await this.item.update({ [`system.${collectionName}`]: collection })
    return
  }

  //Delete's a skill in the main  list
  /**
   *
   * @param event
   * @param collectionName
   */
  async #onItemDelete (event, collectionName = 'skills') {
    event.preventDefault()
    event.stopImmediatePropagation()
    collectionName = event.currentTarget.dataset.coll
    const item = $(event.currentTarget).closest('.item')
    const itemId = item.data('item-id')
    const itemIndex = this.item.system[collectionName].findIndex(i => (itemId && i.uuid === itemId))
    if (itemIndex > -1) {
      const collection = this.item.system[collectionName] ? foundry.utils.duplicate(this.item.system[collectionName]) : []
      collection.splice(itemIndex, 1)
      await this.item.update({ [`system.${collectionName}`]: collection })
    }
  }


  //View a skill from the main list
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
  _onDragOver (event) { }



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
