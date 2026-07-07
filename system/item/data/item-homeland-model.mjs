import AOVItemBaseModel from './base-item-model.mjs'

export default class AOVHomelandModel extends AOVItemBaseModel {

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = super.defineSchema()
    schema.skills = new fields.ArrayField(new fields.DataField(), { initial: [] })  //List of skills to select from
    schema.passions = new fields.ArrayField(new fields.DataField(), { initial: [] }) //List of passions
    schema.equipment = new fields.ArrayField(new fields.DataField(), { initial: [] }) //Starting weapons and armour
    schema.historyToday = new fields.ArrayField(new fields.DataField(), { initial: [] }) //Family History Tables
    schema.description = new fields.StringField({ required: true, blank: true })
    schema.gmNotes = new fields.StringField({ required: true, blank: true })
    schema.mythic = new fields.BooleanField({ initial: false }) //Can you improve mythic skills with personal bonus
    return schema
  }




}
