import AOVDataModel from '../../data/base-model.mjs'

export default class AOVItemBaseModel extends AOVDataModel {

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = {}

    schema.description = new fields.StringField({ required: true, blank: true })
    schema.gmNotes = new fields.StringField({ required: true, blank: true })
    schema.source = new fields.StringField({ required: true, blank: true, initial: '' })  //Source of item

    return schema
  }

}
