import AOVDataModel from '../../data/base-model.mjs'
import { AOVActor } from '../actor.mjs'

export default class AOVActorBaseModel extends AOVDataModel {

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = {}
    schema.move = new fields.SchemaField({
      base: new fields.NumberField({ ...requiredInteger, initial: 10 }),
      bonus: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      penalty: new fields.NumberField({ required: true, nullable: false, integer: false, initial: 0 })
    })
    schema.reputation = new fields.SchemaField({
      base: new fields.NumberField({ ...requiredInteger, initial: 5 }),
      history: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      xp: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      effects: new fields.NumberField({ ...requiredInteger, initial: 0 })
    })
    schema.status = new fields.SchemaField({
      base: new fields.NumberField({ ...requiredInteger, initial: 25 }),
      xp: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      effects: new fields.NumberField({ ...requiredInteger, initial: 0 })
    })
    schema.hp = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      bonus: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      effects: new fields.NumberField({ ...requiredInteger, initial: 0 })
    })
    schema.mp = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 5 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 5 }),
      bonus: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      effects: new fields.NumberField({ ...requiredInteger, initial: 0 })
    })
    schema.description = new fields.StringField({ required: true, blank: true })
    schema.gmNotes = new fields.StringField({ required: true, blank: true })
    schema.locked = new fields.BooleanField({ initial: false })  //Flag to lock the actor sheet
    schema.uncommon = new fields.BooleanField({ initial: false })  //Flag to show uncommon skills or not
    schema.alphaSkills = new fields.BooleanField({ initial: false })  //Flag to list the skills in alphabetical order
    schema.showRunes = new fields.BooleanField({ initial: true })  //Flag to show the runes
    schema.parryBonus = new fields.NumberField({ ...requiredInteger, initial: 0  })  //Parry Bonus
    schema.apBonus = new fields.NumberField({ ...requiredInteger, initial: 0  })  //AP Bonus to all hit locations
    schema.apBestow = new fields.NumberField({ ...requiredInteger, initial: 0  })  //AP Override to all hit locations
    schema.hrBonus = new fields.NumberField({ ...requiredInteger, initial: 0 }) // Healing Rate Bonus
    schema.hrAdjust = new fields.NumberField({ required: true, nullable: false, integer: false, initial: 1 }) // Healing Rate Multiplier
    schema.beserkerOpt = new fields.BooleanField({ initial: false })  //Can the actor go beserk
    schema.beserkerStat = new fields.BooleanField({ initial: false })  //Is the actor go beserk
    schema.powResist = new fields.NumberField({ ...requiredInteger, initial: 0 })  //Magical Defence bonus
    schema.parryBonus = new fields.NumberField({ ...requiredInteger, initial: 0 })  //Parry bonus
    schema.sizSpecial = new fields.NumberField({ ...requiredInteger, initial: 0 })  //Reverse SIZ adjustment for HP Calc

    // Iterate over ability names and create a new SchemaField for each.
    schema.abilities = new fields.SchemaField(Object.keys(CONFIG.AOV.abilities).reduce((obj, ability) => {
      obj[ability] = new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 10, min: 0 }),
        age: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        xp: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        effects: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        formula:new fields.StringField({ required: true, blank: true }),
        min: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        max: new fields.NumberField({ ...requiredInteger, initial: 0 }),
        average: new fields.StringField({ required: true, blank: true })
      })
      return obj
    }, {}))
    return schema
  }

}
