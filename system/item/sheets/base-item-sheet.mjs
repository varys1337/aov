import { getCIDFrameButton, openCIDEditor } from '../../cid/cid-button.mjs'

const { api, sheets } = foundry.applications

export class AoVItemSheet extends api.HandlebarsApplicationMixin(sheets.ItemSheetV2) {
  /**
   *
   * @param options
   */
  constructor (options = {}) {
    super(options)
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
  _getFrameButtons (options) {
    const buttons = super._getFrameButtons(options)
    const cidButton = getCIDFrameButton(this.document, 'editCid')
    if (cidButton) buttons.unshift(cidButton)
    return buttons
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
      callback: async (path) => {
        await this.document.update({ [attr]: path })
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
    openCIDEditor(this.document)
  }

  // Toggle something on the item
  /**
   *
   * @param event
   * @param target
   */
  static async _onItemToggle (event, target) {
    event.preventDefault()
    let checkProp = {}
    const prop = target.dataset.property
    if (['noXP', 'xpCheck', 'specSkill', 'common', 'treated', 'prepared', 'mythic', 'depend', 'dies', 'special'].includes(prop)) {
      checkProp = { [`system.${prop}`]: !this.item.system[prop] }
    } else { return }

    await this.item.update(checkProp)

    if (prop === 'specSkill') {
      await AoVItemSheet.skillChangeName(this.item)
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
}
