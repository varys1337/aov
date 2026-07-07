import AOVItemBaseModel from './base-item-model.mjs'

export default class AOVNPCPowerModel extends AOVItemBaseModel {

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = super.defineSchema()
    schema.priority = new fields.NumberField({ ...requiredInteger, initial: 0 })  //Priority for displayed order
    return schema
  }

}
