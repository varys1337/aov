import AOVItemBaseModel from './base-item-model.mjs'

export default class AOVPassionModel extends AOVItemBaseModel {

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = super.defineSchema()
    schema.base = new fields.NumberField({ ...requiredInteger, initial: 0 })  //Base score of passion%
    schema.home = new fields.NumberField({ ...requiredInteger, initial: 0 })  //Homeland score of passion%
    schema.history = new fields.NumberField({ ...requiredInteger, initial: 0 })  //History bonus for passion%
    schema.family = new fields.NumberField({ ...requiredInteger, initial: 0 })  //Family score of passion%
    schema.xp = new fields.NumberField({ ...requiredInteger, initial: 0 })  //Acquired XP for passion%
    schema.effects = new fields.NumberField({ ...requiredInteger, initial: 0 })  //Effects for passion%
    schema.noXP = new fields.BooleanField({ initial: false }) //Can passion get XP check
    schema.xpCheck = new fields.BooleanField({ initial: false }) //Has passion got an XP check
    schema.augment = new fields.BooleanField({ initial: false }) //Has passion been used for an augment
    schema.common = new fields.BooleanField({ initial: true }) //Is this a common passion
    schema.critMult = new fields.NumberField({ required: true, nullable: false, integer: false, initial: 1 }) //Crit Chance multiplier.  Driven by Active Effects.
    schema.fumbleMult = new fields.NumberField({ required: true, nullable: false, integer: false, initial: 1 }) //Fumble Chance multiplier.  Driven by Active Effects.
    return schema
  }

}
