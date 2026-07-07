import AOVItemBaseModel from './base-item-model.mjs'

export default class AOVWeaponCatModel extends AOVItemBaseModel {

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = super.defineSchema()
    return schema
  }

}
