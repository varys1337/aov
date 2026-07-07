import AOVActorBaseModel from './base-actor-model.mjs'

export default class AOVFarmModel extends AOVActorBaseModel {

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = super.defineSchema()
    schema.size = new fields.NumberField({ ...requiredInteger, initial: 20 })  //Size of farm in hectares
    schema.farmType = new fields.StringField({ required: true, blank: true, initial: '' }) //Farm Type
    schema.value = new fields.NumberField({ ...requiredInteger, initial: 0 }) //Farm Value
    schema.animals = new fields.StringField({ required: true, blank: true, initial: '' }) //Animals
    schema.cattle = new fields.NumberField({ ...requiredInteger, initial: 0 }) //Number of Cattle
    schema.sheep = new fields.NumberField({ ...requiredInteger, initial: 0 }) //Number of Sheep
    schema.horses = new fields.NumberField({ ...requiredInteger, initial: 0 }) //Number of |Horses

    schema.location = new fields.NumberField({ ...requiredInteger, initial: 0 }) //Grid location of the farm
    schema.status = new fields.StringField({ required: true, blank: true, initial: 'good' }) //Farm status
    return schema
  }

  /**
   *
   */
  prepareDerivedData () {
    // Loop through ability scores, and add their modifiers to our sheet output.
    for (const key in this.abilities) {
      // Handle ability label localization.
      this.abilities[key].label = game.i18n.localize(CONFIG.AOV.abilities[key]) ?? key
    }
  }

  /**
   *
   */
  getRollData () {
    const data = {}

    // Copy the ability scores to the top level, so that rolls can use them
    if (this.abilities) {
      for (let [k, v] of Object.entries(this.abilities)) {
        data[k] = foundry.utils.deepClone(v)
      }
    }
    return data
  }

}
