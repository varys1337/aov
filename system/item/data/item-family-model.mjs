import AOVItemBaseModel from './base-item-model.mjs'

export default class AOVFamilyModel extends AOVItemBaseModel {

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = super.defineSchema()
    schema.born = new fields.NumberField({ ...requiredInteger, initial: 955 }) //Year Born
    schema.died = new fields.NumberField({ required: true, nullable: true, integer: true }) //Year Died
    schema.relation = new fields.StringField({ required: true, blank: true, initial: '' })  //Relationship to character - deprecated for relationship
    schema.gender = new fields.StringField({ required: true, blank: true, initial: 'male' })  //Gender
    schema.spiritAn = new fields.StringField({ required: true, blank: true })  //Spirit Animal
    schema.depend = new fields.BooleanField({ initial: true })   //Dependent
    schema.relationship = new fields.StringField({ required: true, blank: true, initial: 'other' })  //Relationship to character
    return schema
  }

}
