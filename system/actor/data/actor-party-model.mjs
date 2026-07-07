import AOVActorBaseModel from './base-actor-model.mjs'

export default class AOVPartyModel extends AOVActorBaseModel {

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = super.defineSchema()

    schema.members = new fields.ArrayField(new fields.ObjectField()) // Holds an Array of Actor UUIDs for party members

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
