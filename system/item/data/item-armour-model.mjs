import AOVItemBaseModel from './base-item-model.mjs'

export default class AOVArmourModel extends AOVItemBaseModel {

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = super.defineSchema()
    schema.coverage = new fields.StringField({ required: true, blank: true, initial: '' })  //Description of coverage
    schema.type = new fields.StringField({ required: true, blank: true, initial: '' })  //Armour Type
    schema.material = new fields.StringField({ required: true, blank: true, initial: '' })  //Material
    schema.lowLoc = new fields.NumberField({ ...requiredInteger, initial: 1 }) //Low hit location value
    schema.highLoc = new fields.NumberField({ ...requiredInteger, initial: 1 }) //High hit location value
    schema.equipStatus = new fields.NumberField({ ...requiredInteger, initial: 1 }) //Equipped status
    schema.enc = new fields.NumberField({ required: true, nullable: false, initial: 0 }) //ENC value
    schema.map = new fields.NumberField({ ...requiredInteger, initial: 0 }) //Max Armour Points
    schema.cost = new fields.NumberField({ ...requiredInteger, initial: 0 }) //Cost
    schema.mqPenalty = new fields.NumberField({ ...requiredInteger, initial: 0 }) //Move Quietly penalty
    return schema
  }

}
