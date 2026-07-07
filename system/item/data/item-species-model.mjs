import AOVItemBaseModel from './base-item-model.mjs'

export default class AOVSpeciesModel extends AOVItemBaseModel {

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = super.defineSchema()

    schema.hitlocs = new fields.ArrayField(new fields.DataField(), { initial: [] })
    schema.description = new fields.StringField({ required: true, blank: true })
    schema.gmNotes = new fields.StringField({ required: true, blank: true })

    // Iterate over ability names and create a new SchemaField for each.
    schema.abilities = new fields.SchemaField(Object.keys(CONFIG.AOV.abilities).reduce((obj, ability) => {
      obj[ability] = new fields.SchemaField({
        min: new fields.NumberField({ ...requiredInteger, initial: 3 }),
        max: new fields.NumberField({ ...requiredInteger, initial: 21 }),
        formula:new fields.StringField({ required: true, blank: true, initial: '3D6' })
      })
      return obj
    }, {}))


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

}
