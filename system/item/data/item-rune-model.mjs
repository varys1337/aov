import AOVItemBaseModel from './base-item-model.mjs'

export default class AOVRuneModel extends AOVItemBaseModel {

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = super.defineSchema()
    schema.meaning = new fields.StringField({ required: true, blank: true, initial: '' }) //Rune meaning
    schema.areas = new fields.StringField({ required: true, blank: true, initial: '' }) //Areas of Power
    schema.use1= new fields.StringField({ required: true, blank: true, initial: '' }) //Rune use 1
    schema.use2= new fields.StringField({ required: true, blank: true, initial: '' }) //Rune use 2
    schema.use3= new fields.StringField({ required: true, blank: true, initial: '' }) //Rune use 3
    schema.effect1= new fields.StringField({ required: true, blank: true, initial: 'none' }) //Rune effect 1
    schema.effect2= new fields.StringField({ required: true, blank: true, initial: 'none' }) //Rune effect 2
    schema.effect3= new fields.StringField({ required: true, blank: true, initial: 'none' }) //Rune effect 3
    schema.value1 = new fields.NumberField({ required: true, initial: 0 })  //Rune effect value 1
    schema.value2 = new fields.NumberField({ required: true, initial: 0 })  //Rune effect value 2
    schema.value3 = new fields.NumberField({ required: true, initial: 0 })  //Rune effect value 3
    return schema
  }

}
