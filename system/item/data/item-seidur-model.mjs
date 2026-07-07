import AOVItemBaseModel from './base-item-model.mjs'

export default class AOVSeidurModel extends AOVItemBaseModel {

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = super.defineSchema()
    schema.realm = new fields.StringField({ required: true, blank: true, initial: 'mind' }) //Realm of spell
    schema.duration = new fields.NumberField({ ...requiredInteger, initial: 0 }) //Duration of spell
    schema.distance = new fields.NumberField({ ...requiredInteger, initial: 0 }) //Distance of spell
    schema.dimension = new fields.NumberField({ ...requiredInteger, initial: 0 }) //Dimension of spell
    schema.shortDesc = new fields.StringField({ required: true, blank: true, initial: '' }) //Short Description
    schema.prepared = new fields.BooleanField({ initial: false })   //Spell is active
    return schema
  }

}
