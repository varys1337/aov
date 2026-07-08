import AOVActorBaseModel from './base-actor-model.mjs'

export default class AOVPartyModel extends AOVActorBaseModel {

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = super.defineSchema()

    const actorReference = () => new fields.SchemaField({
      uuid: new fields.StringField({ required: true, blank: true })
    })

    /*
     * system.members is the one party roster for character and NPC Actor UUIDs.
     * Roster cards, downtime summary rows, and party-scoped workflows all derive
     * from this UUID list so those surfaces cannot drift apart.
     */
    schema.members = new fields.ArrayField(actorReference(), { initial: [] })

    /*
     * Farms and ships are linked by Actor UUID rather than embedded or copied.
     * Both sibling arrays get explicit initials because party sheet asset updates
     * write system.assets atomically and expect both branches to exist.
     */
    schema.assets = new fields.SchemaField({
      farms: new fields.ArrayField(actorReference(), { initial: [] }),
      ships: new fields.ArrayField(actorReference(), { initial: [] })
    })

    return schema
  }

  /**
   *
   * @param source
   */
  static migrateData (source) {
    source = super.migrateData?.(source) ?? source
    source.members = AOVPartyModel.#normalizeReferences(source.members)
    source.assets ??= {}
    source.assets.farms = AOVPartyModel.#normalizeReferences(source.assets.farms)
    source.assets.ships = AOVPartyModel.#normalizeReferences(source.assets.ships)
    return source
  }

  /**
   *
   * @param references
   */
  static #normalizeReferences (references) {
    if (!Array.isArray(references)) return []
    return references.map((reference) => {
      if (typeof reference === 'string') return { uuid: reference }
      if (reference?.uuid) return { uuid: reference.uuid }
      return null
    }).filter((reference) => reference?.uuid)
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
