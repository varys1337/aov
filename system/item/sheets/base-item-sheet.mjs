import { CIDEditor } from '../../cid/cid-editor.mjs'

const { api, sheets } = foundry.applications

export class AoVItemSheet extends api.HandlebarsApplicationMixin(sheets.ItemSheetV2) {
  /**
   *
   * @param options
   */
  constructor (options = {}) {
    super(options)
    this._dragDrop = this._createDragDropHandlers();        
  }

  static DEFAULT_OPTIONS = {
    classes: ['aov', 'sheet', 'item'],
    dragDrop: [{ dragSelector: '[data-drag]', dropSelector: '.droppable' }],      
    position: {
      width: 610,
      height: 520
    },
    window: {
      resizable: true
    },
    tag: 'form',
    form: {
      submitOnChange: true
    },
    actions: {
      onEditImage: this._onEditImage,
      editCid: this._onEditCid,
      itemToggle: this._onItemToggle
    }
  }

  /**
   *
   * @param options
   */
  async _renderFrame (options) {
    const frame = await super._renderFrame(options)
    //define button
    const sheetCID = this.item.flags?.aov?.cidFlag
    const noId = (typeof sheetCID === 'undefined' || typeof sheetCID.id === 'undefined' || sheetCID.id === '')
    //add button
    const label = game.i18n.localize('AOV.CIDFlag.id')
    const cidEditor = `<button type="button" class="header-control icon fa-solid fa-fingerprint ${noId ? 'edit-cid-warning' : 'edit-cid-exisiting'}"
        data-action="editCid" data-tooltip="${label}" aria-label="${label}"></button>`
    let el = this.window.close
    while (el.previousElementSibling.localName === 'button') {
      el = el.previousElementSibling
    }
    el.insertAdjacentHTML('beforebegin', cidEditor)
    return frame
  }

  /**
   *
   * @param options
   */
  async _prepareContext (options) {
    let isChar = false
    if (this.item.isEmbedded === true) {
      if (this.item.parent.type === 'character') {
        isChar = true
      }
    }
    let canEdit = false
    if (this.document.isOwner || game.user.isGM) {
      canEdit = true
    }
    return {
      editable: this.isEditable,
      owner: this.document.isOwner,
      limited: this.document.limited,
      item: this.item,
      flags: this.item.flags,
      system: this.item.system,
      hasOwner: this.item.isEmbedded === true,
      isGM: game.user.isGM,
      fields: this.document.schema.fields,
      config: CONFIG.AOV,
      isChar: isChar,
      canEdit: canEdit,
      isSelectGender: game.settings.get('aov', 'binaryGender')
    }
  }

  //------------ACTIONS-------------------

  // Change Image
  /**
   *
   * @param event
   * @param target
   */
  static async _onEditImage (event, target) {
    const attr = target.dataset.edit
    const current = foundry.utils.getProperty(this.document, attr)
    const { img } = this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ??
      {}
    const fp = new foundry.applications.apps.FilePicker({
      current,
      type: 'image',
      redirectToRoot: img ? [img] : [],
      callback: (path) => {
        this.document.update({ [attr]: path })
      },
      top: this.position.top + 39,
      left: this.position.left + 9
    })
    return fp.browse()
  }

  // Handle editCid action
  /**
   *
   * @param event
   */
  static _onEditCid (event) {
    event.stopPropagation() // Don't trigger other events
    if (event.detail > 1) return // Ignore repeated clicks
    new CIDEditor({ document: this.document }, {}).render(true, { focus: true })
  }

  // Toggle something on the item
  /**
   *
   * @param event
   * @param target
   */
  static _onItemToggle (event, target) {
    event.preventDefault()
    let checkProp = {}
    const prop = target.dataset.property
    if (['noXP', 'xpCheck', 'specSkill', 'common', 'treated', 'prepared', 'mythic', 'depend', 'dies', 'special'].includes(prop)) {
      checkProp = { [`system.${prop}`]: !this.item.system[prop] }
    } else { return }

    this.item.update(checkProp)

    if (prop === 'specSkill') {
      AoVItemSheet.skillChangeName(this.item)
    }
  }

  //Update Skill Name
  /**
   *
   * @param skill
   */
  static async skillChangeName (skill) {
    let newName = ''
    let specialName = skill.system.specialisation
    if (skill.system.mainName === '') {
      await skill.update({
        'system.mainName': skill.name
      })
    }
    if (skill.system.specSkill) {
      if (specialName === '') {
        specialName = game.i18n.localize('AOV.specify')
      }
      newName = skill.system.mainName + ' (' + specialName + ')'
    } else {
      newName = skill.system.mainName
    }
    if (skill.name != newName || skill.system.specialisation != specialName) {
      await skill.update({
        'name': newName,
        'system.specialisation': specialName
      })
    }
  }

 //-----------------------DRAG DROP-----------------------------------

  _canDragStart(selector) {
    // game.user fetches the current user
    return this.isEditable;
  }

  _canDragDrop(selector) {
    // game.user fetches the current user
    return this.isEditable;
  }


  _onDragStart(event) {
    const li = event.currentTarget;
    if ('link' in event.target.dataset) return;

    let dragData = null;

    // Active Effect
    if (li.dataset.effectId) {
      const effect = this.item.effects.get(li.dataset.effectId);
      if (!effect) return;
      dragData = effect.toDragData();
    }

    if (!dragData) return;

    // Set data transfer
    event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
  }

  _onDragOver(event) {}

  //Handle the dropping of ActiveEffect data onto an Item Sheet
  async _onDropActiveEffect(event, effect) {
    let newEffect = effect.toObject();
    newEffect.transfer = true
    const item = this.document;
    if ( !this.isEditable || !item.isOwner || (item === effect.parent) ) return null;
    const result = await ActiveEffect.implementation.create(newEffect, {parent: item});
    return result ?? null;
  }

   async _onDropItem(event, data) {
    if (!this.item.isOwner) return false;
  }

   async _onDropFolder(event, data) {
    if (!this.item.isOwner) return [];
  }

   get dragDrop() {
    return this._dragDrop;
  }

  // This is marked as private because there's no real need
  // for subclasses or external hooks to mess with it directly
  _dragDrop;

   _createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      };
      d.callbacks = {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      };
      return new foundry.applications.ux.DragDrop.implementation(d);
    });
  }

}
