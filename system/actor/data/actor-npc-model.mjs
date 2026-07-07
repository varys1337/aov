import AOVActorBaseModel from './base-actor-model.mjs'

export default class AOVNPCModel extends AOVActorBaseModel {

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = super.defineSchema()
    schema.movement = new fields.StringField({ required: true, blank: true, initial: '10' })
    schema.persType = new fields.StringField({ required: true, blank: true })
    schema.tabView = new fields.StringField({ required: true, blank: true, initial: '1' })
    schema.noteView = new fields.BooleanField({ initial: false }) //Show NPC notes tab
    schema.skillView = new fields.BooleanField({ initial: true }) //Expand NPC skills
    schema.hitlocView = new fields.BooleanField({ initial: true }) //Expand NPC hitlocations
    schema.weaponView = new fields.BooleanField({ initial: true }) //Expand NPC weapons
    schema.powerView = new fields.BooleanField({ initial: true }) //Expand NPC powers
    schema.equipView = new fields.BooleanField({ initial: true }) //Expand NPC equipment
    schema.passionView = new fields.BooleanField({ initial: true }) //Expand NPC passions
    schema.devotionView = new fields.BooleanField({ initial: true }) //Expand NPC devotions
    schema.effectView = new fields.BooleanField({ initial: true }) //Expand NPC active effects
    schema.spiritAn = new fields.StringField({ required: true, blank: true })
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
