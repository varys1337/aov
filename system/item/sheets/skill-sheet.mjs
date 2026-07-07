import { AoVItemSheet } from './base-item-sheet.mjs'
import { AOVSelectLists } from '../../apps/select-lists.mjs'
import { AOVUtilities } from '../../apps/utilities.mjs'

export class AoVSkillSheet extends AoVItemSheet {
  /**
   *
   * @param options
   */
  constructor (options = {}) {
    super(options)
    this.#dragDrop = this.#createDragDropHandlers()
  }

  static DEFAULT_OPTIONS = {
    classes: ['skill'],
    dragDrop: [{ dragSelector: '[data-drag]', dropSelector: '.droppable' }],
    position: {
      width: 610,
      height: 590
    }
  }

  static PARTS = {
    header: { template: 'systems/aov/templates/item/skill.header.hbs' },
    tabs: { template: 'systems/aov/templates/generic/tab-navigation.hbs' },
    details: {
      template: 'systems/aov/templates/item/skill.detail.hbs',
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
        skills.push({ uuid: skill.uuid, cid: skill.cid, name: tempLoc.name })
      } else {
        skills.push({ uuid: skill.uuid, cid: skill.cid, name: game.i18n.localize('AOV.invalid') })
      }
    }
    context.skillCatOptions = await AOVSelectLists.skillCat()
    context.skillCatName = game.i18n.localize('AOV.skillCat.' + context.system.category)
    context.baseSkillOptions = await AOVSelectLists.baseSkill()
    context.baseSkillName = game.i18n.localize('AOV.' + context.system.baseVal)
    context.realmList = await AOVSelectLists.realmList()
    context.realmName = game.i18n.localize('AOV.realm' + context.system.realm)
    context.isSeidur = false
    if (context.flags.aov?.cidFlag?.id === 'i.skill.seiour-magic') {
      context.isSeidur = true
    }
    context.weaponTypeOptions = await AOVSelectLists.weaponType()
    context.weaponTypeName = game.i18n.localize('AOV.' + context.system.weaponType)
    context.weaponCatName = ''
    if (context.system.category === 'cbt') {
      context.weaponCatOptions = await AOVSelectLists.getWeaponCategories()
      let weaponCat = await game.aov.cid.fromCID(context.system.weaponCat)
      if (weaponCat.length>0) {
        context.weaponCatName = weaponCat[0].name ?? ''
      }
    }
    context.system.total = (context.system.base ?? 0) + (context.system.xp ?? 0) + (context.system.home ?? 0) + Number(context.system.history ?? 0) + (context.system.dev ?? 0) + (context.system.pers ?? 0) + (context.system.effects ?? 0)
    context.system.catBonus = 0
    if (context.hasOwner && context.system.total > 0) {
      context.system.catBonus = this.item.parent.system[this.item.system.category] ?? 0
    }
    context.system.total += context.system.catBonus
    context.skills = skills.sort(function (a, b) {return a.name.localeCompare(b.name)})

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


  //Activate event listeners using the prepared sheet HTML
  /**
   *
   * @param context
   * @param _options
   */
  _onRender (context, _options) {
    this.#dragDrop.forEach((d) => d.bind(this.element))
    this.element.querySelectorAll('.item-delete').forEach(n => n.addEventListener('dblclick', this.#onItemDelete.bind(this)))
    this.element.querySelectorAll('.item-view').forEach(n => n.addEventListener('click', this.#onItemView.bind(this)))
    this.element.querySelectorAll('.changeName').forEach(n => n.addEventListener('change', AoVItemSheet.skillChangeName(this.item)))
  }


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
      collection.push({ uuid: item.uuid, cid: item.flags.aov.cidFlag.id })

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

  //-----------------------ACTIONS-----------------------------------




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
