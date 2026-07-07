import AOVItemBaseModel from './base-item-model.mjs'

export default class AOVWoundModel extends AOVItemBaseModel {

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = super.defineSchema()
    schema.damage = new fields.NumberField({ ...requiredInteger, min: 0, initial: 1 })  //Damage
    schema.treated = new fields.BooleanField({ initial: false }) //Has the wound been treated
    schema.hitLocId = new fields.DocumentIdField({ required: true, nullable: true, initial: null }) //ID of the hit loc the wound is on
    return schema
  }

}
