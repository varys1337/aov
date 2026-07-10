import { AOVDisplaySettings } from './settings-displayOptions.mjs'
import { AOVCIDSettings } from './settings-cidOptions.mjs'
import { AOVGameYearSettings } from './settings-gameYear.mjs'
import { AOVNPCSettings } from './settings-npcOptions.mjs'
import { AOVCreateSettings } from './settings-creationOptions.mjs'
import { AOVCombatSettings } from './settings-combatOptions.mjs'


export async function registerSettings () {
  //Game Year Settings Button
  game.settings.registerMenu('aov', 'gameYearSettings', {
    name: 'AOV.Settings.gameYearSettingsHint',
    label: 'AOV.Settings.gameYearSettings',
    icon: 'fas fa-calendar-days',
    type: AOVGameYearSettings,
    restricted: true
  })
  AOVGameYearSettings.registerSettings()

  //Character Creation Settings Button
  game.settings.registerMenu('aov', 'createSettings', {
    name: 'AOV.Settings.createSettingsHint',
    label: 'AOV.Settings.createSettings',
    icon: 'fas fa-user',
    type: AOVCreateSettings,
    restricted: true
  })
  AOVCreateSettings.registerSettings()

  //NPC Settings Button
  game.settings.registerMenu('aov', 'npcSettings', {
    name: 'AOV.Settings.npcSettingsHint',
    label: 'AOV.Settings.npcSettings',
    icon: 'fas fa-hydra',
    type: AOVNPCSettings,
    restricted: true
  })
  AOVNPCSettings.registerSettings()

  //Display Settings Button
  game.settings.registerMenu('aov', 'displayOptions', {
    name: 'AOV.Settings.displayOptionsHint',
    label: 'AOV.Settings.displayOptions',
    icon: 'fas fa-palette',
    type: AOVDisplaySettings,
    restricted: false
  })
  AOVDisplaySettings.registerSettings()

  //Combat Settings Button
  game.settings.registerMenu('aov', 'combatOptions', {
    name: 'AOV.Settings.combatOptionsHint',
    label: 'AOV.Settings.combatOptions',
    icon: 'fas fa-swords',
    type: AOVCombatSettings,
    restricted: true
  })
  AOVCombatSettings.registerSettings()

  //Chaosium ID Settings Button
  game.settings.registerMenu('aov', 'cidOptions', {
    name: 'AOV.Settings.cidOptionsHint',
    label: 'AOV.Settings.cidOptions',
    icon: 'fas fa-fingerprint',
    type: AOVCIDSettings,
    restricted: true
  })
  AOVCIDSettings.registerSettings()

  //Invisible Settings
  game.settings.register('aov', 'developmentEnabled', {
    name: 'Development phased allowed',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false
  })

  game.settings.register('aov', 'createEnabled', {
    name: 'Creation phase gain',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false
  })

  game.settings.register('aov', 'victoryEnabled', {
    name: 'Victory Sacrifice phase',
    scope: 'world',
    config: false,
    type: Boolean,
    default: false
  })

  game.settings.register('aov', 'systemVersion', {
    name: 'AoV System Version',
    scope: 'world',
    config: false,
    type: String,
    default: ''
  })

  game.settings.register('aov', 'showLogo', {
    name: 'Show AoV Logo',
    scope: 'world',
    config: false,
    type: Boolean,
    default: true
  })

  game.settings.register('aov', 'partyCompactView', {
    name: 'AOV.Party.CompactView',
    scope: 'client',
    config: false,
    type: Boolean,
    default: false
  })
}
