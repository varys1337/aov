import AOVItemBaseModel from './base-item-model.mjs'

export default class AOVDevotionModel extends AOVItemBaseModel {

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = super.defineSchema()
    schema.dp = new fields.NumberField({ ...requiredInteger, initial: 0 })  //Devotion Points
    schema.ideals = new fields.StringField({ required: true, blank: true, initial: '' })  //Ideals
    schema.skills = new fields.ArrayField(new fields.DataField(), { initial: [] }) //Add a relevant Worship Deity skill
    return schema
  }

}
