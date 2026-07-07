import { AoVItemSheet } from './base-item-sheet.mjs'

export class AoVWeaponCatSheet extends AoVItemSheet {
  /**
   *
   * @param options
   */
  constructor (options = {}) {
    super(options)
  }

  static DEFAULT_OPTIONS = {
    classes: ['weaponcat'],
    position: {
      width: 600,
      height: 150
    }
  }

  static PARTS = {
    header: { template: 'systems/aov/templates/item/item.header.hbs' }
  }

  /**
   *
   * @param options
   */
  async _prepareContext (options) {
    let context = await super._prepareContext(options)
    return context
  }

  /** @override */
  async _preparePartContext (partId, context) {
    return context
  }




  //-----------------------ACTIONS-----------------------------------





}
