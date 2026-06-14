import AOVActorBaseModel from "./base-actor-model.mjs";

export default class AOVCharacterModel extends AOVActorBaseModel {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();
    schema.move = new fields.SchemaField({
      base: new fields.NumberField({ ...requiredInteger, initial: 10 }),
      bonus: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      penalty: new fields.NumberField({ ...requiredInteger, initial: 0 }),
    });
    schema.reputation = new fields.SchemaField({
      base: new fields.NumberField({ ...requiredInteger, initial: 5 }),
      history: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      xp: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      effects: new fields.NumberField({ ...requiredInteger, initial: 0 }),
    });
    schema.status = new fields.SchemaField({
      base: new fields.NumberField({ ...requiredInteger, initial: 25 }),
      xp: new fields.NumberField({ ...requiredInteger, initial: 0 }),
      effects: new fields.NumberField({ ...requiredInteger, initial: 0 }),
    });
    schema.hrBonus = new fields.NumberField({ ...requiredInteger, initial: 0 }); // Healing Rate Bonus
    schema.birthYear = new fields.NumberField({ ...requiredInteger, initial: 955 });
    schema.nickname = new fields.StringField({ required: true, blank: true });
    schema.gender = new fields.StringField({ required: true, blank: true });
    schema.persType = new fields.StringField({ required: true, blank: true });
    schema.spiritAn = new fields.StringField({ required: true, blank: true });
    schema.distFeatures = new fields.StringField({ required: true, blank: true });
    schema.nameMean = new fields.StringField({ required: true, blank: true });
    schema.weaponCats = new fields.SchemaField({});  //Blank array to hold weapon category bonuses
    schema.farms = new fields.ArrayField(new fields.ObjectField()); // Holds an Array of Farm Actor UUIDs
    schema.vadmal = new fields.NumberField({ ...requiredInteger, initial: 0 });
    schema.species = new fields.StringField({ required: true, blank: true, initial: game.i18n.localize('AOV.human')}); //Manual entered species name
    schema.home = new fields.StringField({ required: true, blank: true, initial: game.i18n.localize('AOV.iceland')}); //Manual entered homeland name
    schema.grandparents = new fields.BooleanField({ initial: false }); //Is your grandparent dead
    schema.parents = new fields.BooleanField({ initial: false }); //Is your parent dead
    schema.expImprov = new fields.BooleanField({ initial: false });  //Can you make XP Improvement rolls
    schema.improv = new fields.BooleanField({ initial: false });  //Can you make Other Improvement
    schema.worship = new fields.BooleanField({ initial: false });  //Can you make Worship Rolls
    schema.farming = new fields.BooleanField({ initial: false });  //Can you make Farm Circumstance Rolls
    schema.vadprod = new fields.BooleanField({ initial: false });  //Can you make Vadmal Production
    schema.aging = new fields.BooleanField({ initial: false });  //Can you make Aging rolls
    schema.family = new fields.BooleanField({ initial: false });  //Can you make Family rolls
    schema.quickstart = new fields.BooleanField({ initial: false });  //Is this a quickstart character sheet
    schema.social = new fields.StringField({ required: true, blank: true, initial:"freedman" });  //Social Rank

    return schema
  }

  prepareDerivedData() {
    // Loop through ability scores, and add their modifiers to our sheet output.
    for (const key in this.abilities) {
      // Handle ability label localization.
      this.abilities[key].label = game.i18n.localize(CONFIG.AOV.abilities[key]) ?? key;
    }
  }

  getRollData() {
    const data = {};

    // Copy the ability scores to the top level, so that rolls can use them
    if (this.abilities) {
      for (let [k, v] of Object.entries(this.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }
    return data
  }

}
