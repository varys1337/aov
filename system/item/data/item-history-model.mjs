import AOVItemBaseModel from './base-item-model.mjs'

export default class AOVHistoryModel extends AOVItemBaseModel {

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
    schema.reputation = new fields.StringField({ required: true, blank: true }) //Reputation bonus
    schema.description = new fields.StringField({ required: true, blank: true })
    schema.gmNotes = new fields.StringField({ required: true, blank: true })
    schema.year = new fields.NumberField({ required: true, nullable: false, initial: 0 })
    schema.dies = new fields.BooleanField({ initial: false }) //Does the person die in the event
    schema.historyToday = new fields.ArrayField(new fields.DataField(), { initial: [] }) //Family History Tables
    return schema
  }




}
