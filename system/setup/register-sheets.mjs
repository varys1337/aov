import { AoVCharacterSheet } from '../actor/sheets/character-sheet.mjs'
import { AoVNPCSheet } from '../actor/sheets/npc-sheet.mjs'
import { AoVFarmSheet } from '../actor/sheets/farm-sheet.mjs'
import { AoVShipSheet } from '../actor/sheets/ship-sheet.mjs'
import { AoVPartySheet } from '../actor/sheets/party-sheet.mjs'
import { AoVGearSheet } from '../item/sheets/gear-sheet.mjs'
import { AoVSkillSheet } from '../item/sheets/skill-sheet.mjs'
import { AoVPassionSheet } from '../item/sheets/passion-sheet.mjs'
import { AoVHitLocSheet } from '../item/sheets/hitloc-sheet.mjs'
import { AoVWoundSheet } from '../item/sheets/wound-sheet.mjs'
import { AoVWeaponCatSheet } from '../item/sheets/weaponCat-sheet.mjs'
import { AoVDevotionSheet } from '../item/sheets/devotion-sheet.mjs'
import { AoVFamilySheet } from '../item/sheets/family-sheet.mjs'
import { AoVThrallSheet } from '../item/sheets/thrall-sheet.mjs'
import { AoVWeaponSheet } from '../item/sheets/weapon-sheet.mjs'
import { AoVArmourSheet } from '../item/sheets/armour-sheet.mjs'
import { AoVRuneSheet } from '../item/sheets/rune-sheet.mjs'
import { AoVRuneScriptSheet } from '../item/sheets/runescript-sheet.mjs'
import { AoVSeidurSheet } from '../item/sheets/seidur-sheet.mjs'
import { AoVNPCPowerSheet } from '../item/sheets/npcpower-sheet.mjs'
import { AoVSpeciesSheet } from '../item/sheets/species-sheet.mjs'
import { AoVHomelandSheet } from '../item/sheets/homeland-sheet.mjs'
import { AoVHistorySheet } from '../item/sheets/history-sheet.mjs'

export function registerSheets () {


  const { sheets } = foundry.applications
  let { collections } = foundry.documents

  /* // FoundryVTT V12 */
  if (typeof collections === 'undefined') {
    collections = {
      Actors: Actors,
      Items: Items
    }
  }

  collections.Actors.unregisterSheet('core', sheets.ActorSheetV2)
  collections.Actors.registerSheet('aov', AoVCharacterSheet, {
    types: ['character'],
    makeDefault: true
  })
  collections.Actors.registerSheet('aov', AoVNPCSheet, {
    types: ['npc'],
    makeDefault: true
  })
  collections.Actors.registerSheet('aov', AoVFarmSheet, {
    types: ['farm'],
    makeDefault: true
  })
  collections.Actors.registerSheet('aov', AoVShipSheet, {
    types: ['ship'],
    makeDefault: true
  })
  collections.Actors.registerSheet('aov', AoVPartySheet, {
    types: ['party'],
    makeDefault: true
  })

  collections.Items.unregisterSheet('core', sheets.ItemSheetV2)
  collections.Items.registerSheet('aov', AoVGearSheet, {
    types: ['gear'],
    makeDefault: true
  })
  collections.Items.registerSheet('aov', AoVSkillSheet, {
    types: ['skill'],
    makeDefault: true
  })
  collections.Items.registerSheet('aov', AoVPassionSheet, {
    types: ['passion'],
    makeDefault: true
  })
  collections.Items.registerSheet('aov', AoVHitLocSheet, {
    types: ['hitloc'],
    makeDefault: true
  })
  collections.Items.registerSheet('aov', AoVWoundSheet, {
    types: ['wound'],
    makeDefault: true
  })
  collections.Items.registerSheet('aov', AoVWeaponCatSheet, {
    types: ['weaponcat'],
    makeDefault: true
  })
  collections.Items.registerSheet('aov', AoVDevotionSheet, {
    types: ['devotion'],
    makeDefault: true
  })
  collections.Items.registerSheet('aov', AoVFamilySheet, {
    types: ['family'],
    makeDefault: true
  })
  collections.Items.registerSheet('aov', AoVThrallSheet, {
    types: ['thrall'],
    makeDefault: true
  })
  collections.Items.registerSheet('aov', AoVWeaponSheet, {
    types: ['weapon'],
    makeDefault: true
  })
  collections.Items.registerSheet('aov', AoVArmourSheet, {
    types: ['armour'],
    makeDefault: true
  })
  collections.Items.registerSheet('aov', AoVRuneSheet, {
    types: ['rune'],
    makeDefault: true
  })
  collections.Items.registerSheet('aov', AoVRuneScriptSheet, {
    types: ['runescript'],
    makeDefault: true
  })
  collections.Items.registerSheet('aov', AoVSeidurSheet, {
    types: ['seidur'],
    makeDefault: true
  })
  collections.Items.registerSheet('aov', AoVNPCPowerSheet, {
    types: ['npcpower'],
    makeDefault: true
  })
  collections.Items.registerSheet('aov', AoVSpeciesSheet, {
    types: ['species'],
    makeDefault: true
  })
  collections.Items.registerSheet('aov', AoVHomelandSheet, {
    types: ['homeland'],
    makeDefault: true
  })
  collections.Items.registerSheet('aov', AoVHistorySheet, {
    types: ['history'],
    makeDefault: true
  })
}
