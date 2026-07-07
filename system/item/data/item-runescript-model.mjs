import AOVItemBaseModel from './base-item-model.mjs'

export default class AOVRunescriptModel extends AOVItemBaseModel {

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = super.defineSchema()
    schema.runes = new fields.SchemaField({
      rune1 : new fields.StringField({ required: true, blank: true, initial: 'none' }),
      rune2 : new fields.StringField({ required: true, blank: true, initial: 'none' }),
      rune3 : new fields.StringField({ required: true, blank: true, initial: 'none' }),
      rune4 : new fields.StringField({ required: true, blank: true, initial: 'none' }),
      rune5 : new fields.StringField({ required: true, blank: true, initial: 'none' }),
      rune6 : new fields.StringField({ required: true, blank: true, initial: 'none' }),
      rune7 : new fields.StringField({ required: true, blank: true, initial: 'none' }),
      rune8 : new fields.StringField({ required: true, blank: true, initial: 'none' }),
      rune9 : new fields.StringField({ required: true, blank: true, initial: 'none' })
    })
    schema.shortDesc = new fields.StringField({ required: true, blank: true, initial: '' }) //Short Description
    schema.prepared = new fields.BooleanField({ initial: false })   //Runescript is prepared

    return schema
  }

}
