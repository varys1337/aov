import AOVItemBaseModel from './base-item-model.mjs'

export default class AOVHitLocModel extends AOVItemBaseModel {

  /**
   *
   */
  static defineSchema () {
    const fields = foundry.data.fields
    const requiredInteger = { required: true, nullable: false, integer: true }
    const schema = super.defineSchema()
    schema.lowRoll = new fields.NumberField({ ...requiredInteger, initial: 0 })  //Lower hit location D20 range
    schema.highRoll = new fields.NumberField({ ...requiredInteger, initial: 0 })  //Upper hit location D20 range
    schema.hpMod = new fields.NumberField({ ...requiredInteger, initial: 0 })  //Hit Location HP Modifier
    schema.apMod = new fields.NumberField({ ...requiredInteger, initial: 0 })  //Hit Location AP Modifier
    schema.locType = new fields.StringField({ required: true, blank: true, initial: 'limb' }) //Hit Location Type
    schema.gridPos = new fields.NumberField({ ...requiredInteger, initial: 0 })  //Hit Location Grid Position for Characters
    schema.npcDmg = new fields.NumberField({ ...requiredInteger, initial: 0 }) //Damage on hit location for NPCs
    schema.npcAP = new fields.NumberField({ ...requiredInteger, initial: 0 }) //AP on hit location for NPCs
    return schema
  }

}
